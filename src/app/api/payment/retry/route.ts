import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase";
import { getRazorpay } from "@/lib/razorpay";
import { validateOrderStock } from "@/lib/inventory/stock";
import { hydrateShippingSettings } from "@/lib/shipping/settings-store";
import type { CartItem, Order } from "@/types";

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
  const orderNumber = String(body.orderNumber ?? "").trim();
  const orderId = String(body.orderId ?? "").trim();

  if (!orderNumber && !orderId) {
    return NextResponse.json({ error: "Order reference is required" }, { status: 400 });
  }

  const db = createServiceClient();
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  let query = db.from("orders").select("*").eq("user_id", user.id);
  if (orderId) {
    query = query.eq("id", orderId);
  } else {
    query = query.eq("order_number", orderNumber);
  }

  const { data: orderRow } = await query.maybeSingle();
  const order = (orderRow as Order) ?? null;

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.payment_status === "paid") {
    return NextResponse.json({ error: "Order is already paid" }, { status: 409 });
  }

  if (order.status === "cancelled") {
    return NextResponse.json({ error: "Order has been cancelled" }, { status: 409 });
  }

  const items = order.items as CartItem[];
  const stockCheck = await validateOrderStock(db, items);
  if (!stockCheck.ok) {
    return NextResponse.json(
      { error: stockCheck.errors[0]?.message ?? "Insufficient stock", errors: stockCheck.errors },
      { status: 409 }
    );
  }

  const razorpay = getRazorpay();
  if (!razorpay) {
    return NextResponse.json({
      demo: true,
      orderId: order.id,
      orderNumber: order.order_number,
      amount: Math.round(Number(order.total) * 100)
    });
  }

  const amountPaise = Math.round(Number(order.total) * 100);

  try {
    const rzOrder = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: order.order_number.replace(/[^a-zA-Z0-9]/g, "").slice(0, 40)
    });

    const { error: updateError } = await db
      .from("orders")
      .update({
        razorpay_order_id: rzOrder.id,
        payment_status: "pending",
        updated_at: new Date().toISOString()
      })
      .eq("id", order.id)
      .eq("user_id", user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.order_number,
      razorpayOrderId: rzOrder.id,
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: Number(rzOrder.amount)
    });
  } catch (error) {
    console.error("[payment/retry] Razorpay order creation failed", error);
    return NextResponse.json({ error: "Could not restart payment. Please try again." }, { status: 502 });
  }
}
