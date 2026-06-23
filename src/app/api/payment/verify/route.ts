import { NextResponse } from "next/server";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase";
import { sendNewOrderAlerts, notifyCustomerOrderReceived } from "@/lib/server/notifications/new-order-alerts";
import { generateOrderNumber } from "@/lib/orders";
import { validateOrderItems } from "@/lib/checkout/validation";
import { itemsSubtotal } from "@/lib/checkout/totals";
import { deductOrderStock, validateOrderStock } from "@/lib/inventory/stock";
import { createShipmentForOrder } from "@/lib/delivery/shipment-service";
import { hydrateShippingSettings } from "@/lib/shipping/settings-store";
import { assertClientShippingAmount } from "@/lib/shipping/order-shipping";
import { resolveValidatedOrderAddress } from "@/lib/shipping/address-validation";
import { normalizeOrderRecord } from "@/lib/orders/normalize-order";

export async function POST(req: Request) {
  await hydrateShippingSettings();

  const body = await req.json();
  const isDemo = Boolean(body.demo);
  const isCod = Boolean(body.isCod) || body.payment === "cod";

  if (!isDemo && !isCod) {
    const valid = verifyPaymentSignature({
      orderId: body.razorpay_order_id,
      paymentId: body.razorpay_payment_id,
      signature: body.razorpay_signature
    });

    if (!valid) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const itemValidation = validateOrderItems(body.items);
  if (!itemValidation.ok) {
    return NextResponse.json({ error: itemValidation.error }, { status: 400 });
  }
  const items = itemValidation.items;

  const db = createServiceClient();
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

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
    Number(body.shipping_amount ?? body.shippingAmount ?? 0),
    orderAddress
  );
  if (!shippingCheck.ok) {
    return NextResponse.json({ error: shippingCheck.error }, { status: 400 });
  }
  const shippingAmount = shippingCheck.shippingAmount;
  const total = Math.max(0, subtotal + shippingAmount - discountAmount);

  if (body.razorpay_order_id) {
    const { data: existingByRz } = await db
      .from("orders")
      .select("id, order_number, payment_status")
      .eq("razorpay_order_id", body.razorpay_order_id)
      .maybeSingle();

    if (existingByRz?.payment_status === "paid") {
      return NextResponse.json({ success: true, orderNumber: existingByRz.order_number });
    }
  }

  const stockCheck = await validateOrderStock(db, items);
  if (!stockCheck.ok) {
    return NextResponse.json(
      { error: stockCheck.errors[0]?.message ?? "Insufficient stock", errors: stockCheck.errors },
      { status: 409 }
    );
  }

  const orderNumber = generateOrderNumber();
  const paymentStatus = isCod ? "pending" : "paid";
  const orderStatus = isCod ? "pending" : "processing";

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
      status: orderStatus,
      payment_status: paymentStatus,
      payment_method: body.payment ?? body.payment_method ?? (isCod ? "cod" : "upi"),
      razorpay_order_id: body.razorpay_order_id ?? null,
      razorpay_payment_id: body.razorpay_payment_id ?? null,
      shipping_address: orderAddress
    })
    .select("*")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const deduct = await deductOrderStock(db, items);
  if (deduct.error) {
    await db.from("orders").delete().eq("id", order.id);
    return NextResponse.json({ error: deduct.error }, { status: 409 });
  }

  const normalized = await normalizeOrderRecord(db, order, { persist: false });
  await createShipmentForOrder(db, normalized);

  try {
    await sendNewOrderAlerts(db, normalized);
  } catch (error) {
    console.error("[payment/verify] admin new-order alerts failed", {
      orderId: normalized.id,
      orderNumber: normalized.order_number,
      error
    });
  }

  try {
    await notifyCustomerOrderReceived(normalized);
  } catch (error) {
    console.error("[payment/verify] customer thank-you email failed", {
      orderId: normalized.id,
      orderNumber: normalized.order_number,
      error
    });
  }

  return NextResponse.json({ success: true, orderNumber: order.order_number, orderId: order.id });
}
