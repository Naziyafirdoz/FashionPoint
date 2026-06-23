import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase";
import { getRazorpay } from "@/lib/razorpay";
import { generateOrderNumber } from "@/lib/orders";
import { validateOrderItems } from "@/lib/checkout/validation";
import { itemsSubtotal } from "@/lib/checkout/totals";
import { deductOrderStock } from "@/lib/inventory/stock";
import { validateOrderStock } from "@/lib/inventory/stock";
import { createShipmentForOrder } from "@/lib/delivery/shipment-service";
import { hydrateShippingSettings } from "@/lib/shipping/settings-store";
import { assertClientShippingAmount } from "@/lib/shipping/order-shipping";
import { resolveValidatedOrderAddress } from "@/lib/shipping/address-validation";
import { normalizeOrderRecord } from "@/lib/orders/normalize-order";
import { sendNewOrderAlerts, notifyCustomerOrderReceived } from "@/lib/server/notifications/new-order-alerts";

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
  const paymentMethod = String(body.payment ?? "upi");
  const isCod = paymentMethod === "cod";

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

  if (isCod) {
    const orderNumber = generateOrderNumber();
    const orderSubtotal = Number(body.subtotal ?? subtotal);
    const orderShipping = shippingAmount;
    const orderDiscount = Number(body.discount ?? body.discount_amount ?? discountAmount);
    const orderTotal = Number(body.total ?? orderSubtotal + orderShipping - orderDiscount);

    const { data: order, error: insertError } = await db
      .from("orders")
      .insert({
        order_number: orderNumber,
        user_id: user.id,
        items,
        subtotal: orderSubtotal,
        shipping_amount: orderShipping,
        discount_amount: orderDiscount,
        total: orderTotal,
        status: "pending",
        payment_status: "pending",
        payment_method: "cod",
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
      console.error("[orders/create] admin new-order alerts failed", {
        orderId: normalized.id,
        orderNumber: normalized.order_number,
        error
      });
    }

    try {
      await notifyCustomerOrderReceived(normalized);
    } catch (error) {
      console.error("[orders/create] customer thank-you email failed", {
        orderId: normalized.id,
        orderNumber: normalized.order_number,
        error
      });
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.order_number
    });
  }

  const razorpay = getRazorpay();
  let razorpayOrderId: string | null = null;
  let amount = amountPaise;

  if (razorpay && !isCod) {
    const rzOrder = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `fp_${Date.now()}`
    });
    razorpayOrderId = rzOrder.id;
    amount = Number(rzOrder.amount);
  }

  return NextResponse.json({
    razorpayOrderId,
    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    amount,
    demo: !razorpayOrderId,
    isCod,
    subtotal,
    shippingAmount,
    total
  });
}
