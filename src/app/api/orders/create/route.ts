import { NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth/request-user";
import { createServiceClient } from "@/lib/supabase";
import { getRazorpay, getRazorpayPublicKey, isRazorpayConfigured } from "@/lib/razorpay";
import { generateOrderNumber } from "@/lib/orders";
import {
  resolveAuthoritativeDiscount,
  resolveAuthoritativeOrderItems
} from "@/lib/checkout/authoritative-pricing";
import { validateOrderItems } from "@/lib/checkout/validation";
import { amountToPaise } from "@/lib/checkout/totals";
import { isAllowedCheckoutPaymentMethod } from "@/lib/checkout/payment-methods";
import { validateOrderStock } from "@/lib/inventory/stock";
import { assertAuthoritativeClientShippingAmount } from "@/lib/shipping/order-shipping";
import { resolveValidatedOrderAddress } from "@/lib/shipping/address-validation";
import { computeEstimatedDeliveryDate, resolveOrderEtaZone } from "@/lib/orders/delivery-dates";

export async function POST(req: Request) {
  const auth = await requireRequestUser(req);
  if (!auth.ok) return auth.response;
  const { user } = auth;

  if (!isRazorpayConfigured()) {
    return NextResponse.json(
      { error: "Online payment is temporarily unavailable. Please try again later." },
      { status: 503 }
    );
  }

  const body = await req.json();
  const paymentMethod = String(body.payment ?? "");

  if (!isAllowedCheckoutPaymentMethod(paymentMethod)) {
    if (paymentMethod === "cod") {
      return NextResponse.json({ error: "Cash on delivery is not available" }, { status: 400 });
    }
    return NextResponse.json({ error: "Unsupported payment method" }, { status: 400 });
  }

  const itemValidation = validateOrderItems(body.items);
  if (!itemValidation.ok) {
    return NextResponse.json({ error: itemValidation.error }, { status: 400 });
  }

  const discountCheck = resolveAuthoritativeDiscount(body.discount ?? body.discount_amount);
  if (!discountCheck.ok) {
    return NextResponse.json({ error: discountCheck.error }, { status: 400 });
  }
  const discountAmount = discountCheck.discount;

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
  const total = Math.max(0, subtotal + shippingAmount - discountAmount);
  const amountPaise = amountToPaise(total);

  const stockCheck = await validateOrderStock(db, items);
  if (!stockCheck.ok) {
    return NextResponse.json(
      { error: stockCheck.errors[0]?.message ?? "Insufficient stock", errors: stockCheck.errors },
      { status: 409 }
    );
  }

  const persistedBranchId = branchId.startsWith("legacy-") ? null : branchId;
  const zone = await resolveOrderEtaZone(
    {
      branch_id: persistedBranchId,
      shipping_address: orderAddress as Record<string, string>
    },
    db
  );
  const etaZone = zone === "outskirts" ? "outstation" : (zone as "local" | "outstation");
  const estimatedDeliveryDate = computeEstimatedDeliveryDate(new Date(), etaZone);
  const orderNumber = generateOrderNumber();

  const razorpay = getRazorpay();
  const publicKey = getRazorpayPublicKey();
  if (!razorpay || !publicKey) {
    return NextResponse.json(
      { error: "Online payment is temporarily unavailable. Please try again later." },
      { status: 503 }
    );
  }

  let razorpayOrderId: string;
  let amount: number;

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

  const { data: order, error: insertError } = await db
    .from("orders")
    .insert({
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
    key: publicKey,
    amount,
    paymentMethod,
    subtotal,
    shippingAmount,
    total
  });
}
