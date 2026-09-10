import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase";
import { getRazorpay } from "@/lib/razorpay";
import { generateOrderNumber } from "@/lib/orders";
import {
  resolveAuthoritativeDiscount,
  resolveAuthoritativeOrderItems
} from "@/lib/checkout/authoritative-pricing";
import { validateOrderItems } from "@/lib/checkout/validation";
import { validateOrderStock } from "@/lib/inventory/stock";
import { assertAuthoritativeClientShippingAmount } from "@/lib/shipping/order-shipping";
import { resolveValidatedOrderAddress } from "@/lib/shipping/address-validation";
import { computeEstimatedDeliveryDate } from "@/lib/orders/delivery-dates";
import { resolveFulfillmentZoneForAddress } from "@/lib/orders/fulfillment-zone";
import { getAvailableFulfillmentColumns } from "@/lib/orders/fulfillment-schema";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const paymentMethod = String(body.payment ?? "upi");

  // Order row is created in pending / payment_pending before payment verification
  // so it can be associated with the Razorpay order/payment flow.
  if (paymentMethod === "cod") {
    return NextResponse.json({ error: "Cash on delivery is not available" }, { status: 400 });
  }

  const itemValidation = validateOrderItems(body.items);
  if (!itemValidation.ok) {
    return NextResponse.json({ error: itemValidation.error }, { status: 400 });
  }

  resolveAuthoritativeDiscount(body.discount ?? body.discount_amount);

  const addressValidation = await resolveValidatedOrderAddress(body.address);
  if (!addressValidation.ok) {
    return NextResponse.json({ error: addressValidation.error }, { status: 400 });
  }
  const orderAddress = addressValidation.address;

  const shippingCheck = await assertAuthoritativeClientShippingAmount(
    Number(body.shipping_amount ?? 0),
    orderAddress
  );
  if (!shippingCheck.ok) {
    return NextResponse.json({ error: shippingCheck.error }, { status: 400 });
  }
  const shippingAmount = shippingCheck.shippingAmount;
  const branchId = shippingCheck.branchId;

  const db = createServiceClient();
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const pricing = await resolveAuthoritativeOrderItems(db, itemValidation.items);
  if (!pricing.ok) {
    return NextResponse.json(
      {
        error: pricing.error,
        ...(pricing.code ? { code: pricing.code } : {}),
        ...(pricing.items ? { items: pricing.items } : {})
      },
      { status: pricing.status }
    );
  }
  const items = pricing.items;
  const subtotal = pricing.subtotal;
  const discountAmount = pricing.offerDiscount;
  const total = Math.max(0, subtotal + shippingAmount - discountAmount);
  const amountPaise = Math.round(total * 100);

  const stockCheck = await validateOrderStock(db, items);
  if (!stockCheck.ok) {
    return NextResponse.json(
      { error: stockCheck.errors[0]?.message ?? "Insufficient stock", errors: stockCheck.errors },
      { status: 409 }
    );
  }

  const persistedBranchId = branchId.startsWith("legacy-") ? null : branchId;
  const fulfillment = await resolveFulfillmentZoneForAddress(
    orderAddress as { city?: string; state?: string; pincode?: string }
  );
  const etaZone = fulfillment.zone;
  const estimatedDeliveryDate = computeEstimatedDeliveryDate(new Date(), etaZone);
  const orderNumber = generateOrderNumber();

  const razorpay = getRazorpay();
  let razorpayOrderId: string | null = null;
  let amount = amountPaise;

  if (razorpay) {
    try {
      const rzOrder = await razorpay.orders.create({
        amount: amountPaise,
        currency: "INR",
        receipt: orderNumber.replace(/[^a-zA-Z0-9]/g, "").slice(0, 40)
      });
      razorpayOrderId = rzOrder.id;
      amount = Number(rzOrder.amount);
    } catch (error) {
      console.error("[orders/create] Razorpay order creation failed", error);
      return NextResponse.json({ error: "Could not initiate payment. Please try again." }, { status: 502 });
    }
  }

  const fulfillmentColumns = await getAvailableFulfillmentColumns(db);
  const insertPayload: Record<string, unknown> = {
    order_number: orderNumber,
    user_id: user.id,
    items,
    subtotal,
    shipping_amount: shippingAmount,
    branch_id: persistedBranchId,
    discount_amount: discountAmount,
    total,
    status: "pending",
    payment_status: "pending",
    payment_method: paymentMethod,
    razorpay_order_id: razorpayOrderId,
    shipping_address: orderAddress,
    estimated_delivery_date: estimatedDeliveryDate
  };
  if (fulfillmentColumns.has("fulfillment_zone")) {
    insertPayload.fulfillment_zone = fulfillment.zone;
  }

  const { data: order, error: insertError } = await db
    .from("orders")
    .insert(insertPayload)
    .select("id, order_number")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({
    orderId: order.id,
    orderNumber: order.order_number,
    razorpayOrderId,
    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    amount,
    demo: !razorpayOrderId,
    subtotal,
    shippingAmount,
    total
  });
}
