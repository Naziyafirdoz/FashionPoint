import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase";
import { getRazorpay } from "@/lib/razorpay";
import { generateOrderNumber } from "@/lib/orders";
import { validateOrderItems } from "@/lib/checkout/validation";
import { itemsSubtotal } from "@/lib/checkout/totals";
import { validateOrderStock } from "@/lib/inventory/stock";
import { hydrateShippingSettings } from "@/lib/shipping/settings-store";
import { assertClientShippingAmount } from "@/lib/shipping/order-shipping";
import { resolveValidatedOrderAddress } from "@/lib/shipping/address-validation";
import { computeEstimatedDeliveryDate } from "@/lib/orders/delivery-dates";
import { resolveShippingZone } from "@/lib/shipping/city-detection";

export async function POST(req: Request) {
  await hydrateShippingSettings();

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const paymentMethod = String(body.payment ?? "upi");

  if (paymentMethod === "cod") {
    return NextResponse.json({ error: "Cash on delivery is not available" }, { status: 400 });
  }

  const itemValidation = validateOrderItems(body.items);
  if (!itemValidation.ok) {
    return NextResponse.json({ error: itemValidation.error }, { status: 400 });
  }
  const items = itemValidation.items;

  const subtotal = Number(body.subtotal ?? itemsSubtotal(items));
  if (subtotal <= 0) {
    return NextResponse.json({ error: "Order subtotal must be greater than zero" }, { status: 400 });
  }

  const discountAmount = Math.max(0, Number(body.discount ?? body.discount_amount ?? 0));

  const addressValidation = await resolveValidatedOrderAddress(body.address);
  if (!addressValidation.ok) {
    return NextResponse.json({ error: addressValidation.error }, { status: 400 });
  }
  const orderAddress = addressValidation.address;

  const shippingCheck = assertClientShippingAmount(
    Number(body.shipping_amount ?? 0),
    orderAddress
  );
  if (!shippingCheck.ok) {
    return NextResponse.json({ error: shippingCheck.error }, { status: 400 });
  }
  const shippingAmount = shippingCheck.shippingAmount;
  const total = Math.max(0, subtotal + shippingAmount - discountAmount);
  const amountPaise = Math.round(total * 100);

  const db = createServiceClient();
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const stockCheck = await validateOrderStock(db, items);
  if (!stockCheck.ok) {
    return NextResponse.json(
      { error: stockCheck.errors[0]?.message ?? "Insufficient stock", errors: stockCheck.errors },
      { status: 409 }
    );
  }

  const zone = resolveShippingZone(orderAddress);
  const etaZone = zone === "outskirts" ? "outstation" : (zone as "local" | "outstation");
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

  const { data: order, error: insertError } = await db
    .from("orders")
    .insert({
      order_number: orderNumber,
      user_id: user.id,
      items,
      subtotal,
      shipping_amount: shippingAmount,
      discount_amount: discountAmount,
      total,
      status: "pending",
      payment_status: "pending",
      payment_method: paymentMethod,
      razorpay_order_id: razorpayOrderId,
      shipping_address: orderAddress,
      estimated_delivery_date: estimatedDeliveryDate
    })
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
