import { NextResponse } from "next/server";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase";
import { finalizePaidOrder } from "@/lib/checkout/finalize-paid-order";
import { generateInvoiceNumber } from "@/lib/orders/invoice";
import { logWorkflow } from "@/lib/orders/workflow-logger";
import { hydrateShippingSettings } from "@/lib/shipping/settings-store";
import type { Order } from "@/types";

export async function POST(req: Request) {
  await hydrateShippingSettings();

  const body = await req.json();
  const isDemo = Boolean(body.demo);

  logWorkflow("payment_verify_start", {
    isDemo,
    razorpayOrderId: body.razorpay_order_id ?? null
  });

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    logWorkflow("payment_verify_failed", { reason: "unauthorized" }, "warn");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();
  if (!db) {
    logWorkflow("payment_verify_failed", { reason: "database_not_configured" }, "error");
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  let order: Order | null = null;

  if (isDemo) {
    const orderId = String(body.orderId ?? "").trim();
    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    const { data } = await db
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("user_id", user.id)
      .maybeSingle();

    order = (data as Order) ?? null;
  } else {
    if (!body.razorpay_order_id || !body.razorpay_payment_id || !body.razorpay_signature) {
      logWorkflow("payment_verify_failed", { reason: "missing_verification_fields" }, "warn");
      return NextResponse.json({ error: "Missing payment verification fields" }, { status: 400 });
    }

    const valid = verifyPaymentSignature({
      orderId: body.razorpay_order_id,
      paymentId: body.razorpay_payment_id,
      signature: body.razorpay_signature
    });

    logWorkflow("payment_verify_signature", {
      razorpayOrderId: body.razorpay_order_id,
      valid
    });

    if (!valid) {
      logWorkflow("payment_verify_failed", { reason: "invalid_signature" }, "error");
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    const { data } = await db
      .from("orders")
      .select("*")
      .eq("razorpay_order_id", body.razorpay_order_id)
      .maybeSingle();

    order = (data as Order) ?? null;

    if (order && order.user_id !== user.id) {
      logWorkflow(
        "payment_verify_failed",
        { reason: "forbidden", orderId: order.id, userId: user.id },
        "error"
      );
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (!order) {
    logWorkflow("payment_verify_failed", { reason: "order_not_found" }, "warn");
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  logWorkflow("payment_verify_order_loaded", {
    orderId: order.id,
    orderNumber: order.order_number,
    status: order.status,
    paymentStatus: order.payment_status
  });

  if (order.payment_status === "paid") {
    logWorkflow("payment_verify_idempotent", {
      orderId: order.id,
      orderNumber: order.order_number,
      status: order.status
    });
    return NextResponse.json({
      success: true,
      orderNumber: order.order_number,
      orderId: order.id,
      invoiceNumber: generateInvoiceNumber(order.order_number),
      paymentId: order.razorpay_payment_id ?? body.razorpay_payment_id ?? null,
      amountPaid: order.total,
      status: order.status
    });
  }

  if (order.payment_status !== "pending") {
    logWorkflow(
      "payment_verify_failed",
      {
        orderId: order.id,
        orderNumber: order.order_number,
        reason: "not_awaiting_payment",
        paymentStatus: order.payment_status
      },
      "warn"
    );
    return NextResponse.json({ error: "Order is not awaiting payment" }, { status: 409 });
  }

  try {
    const finalized = await finalizePaidOrder(db, order, {
      razorpayPaymentId: body.razorpay_payment_id ?? null
    });

    logWorkflow("payment_verify_success", {
      orderId: finalized.id,
      orderNumber: finalized.order_number,
      status: finalized.status,
      paymentStatus: finalized.payment_status,
      paymentId: finalized.razorpay_payment_id ?? body.razorpay_payment_id ?? null
    });

    return NextResponse.json({
      success: true,
      orderNumber: finalized.order_number,
      orderId: finalized.id,
      invoiceNumber: generateInvoiceNumber(finalized.order_number),
      paymentId: finalized.razorpay_payment_id ?? body.razorpay_payment_id ?? null,
      amountPaid: finalized.total,
      status: finalized.status
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payment confirmation failed";
    logWorkflow(
      "payment_verify_failed",
      {
        orderId: order.id,
        orderNumber: order.order_number,
        error: message
      },
      "error"
    );
    const status = message.toLowerCase().includes("stock") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
