import { NextResponse } from "next/server";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase";
import { confirmCapturedRazorpayPayment } from "@/lib/checkout/confirm-razorpay-payment";
import { generateInvoiceNumber } from "@/lib/orders/invoice";
import { logWorkflow } from "@/lib/orders/workflow-logger";
import { hydrateShippingSettings } from "@/lib/shipping/settings-store";
import type { Order } from "@/types";

export async function POST(req: Request) {
  await hydrateShippingSettings();

  const body = await req.json();

  logWorkflow("payment_verify_start", {
    razorpayOrderId: body.razorpay_order_id ?? null
  });

  if (body.demo === true) {
    logWorkflow("payment_verify_failed", { reason: "demo_rejected" }, "warn");
    return NextResponse.json({ error: "Demo payment is not allowed" }, { status: 400 });
  }

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

  if (!body.razorpay_order_id || !body.razorpay_payment_id || !body.razorpay_signature) {
    logWorkflow("payment_verify_failed", { reason: "missing_verification_fields" }, "warn");
    return NextResponse.json({ error: "Missing payment verification fields" }, { status: 400 });
  }

  const razorpayOrderId = String(body.razorpay_order_id);
  const razorpayPaymentId = String(body.razorpay_payment_id);
  const razorpaySignature = String(body.razorpay_signature);

  const valid = verifyPaymentSignature({
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature
  });

  logWorkflow("payment_verify_signature", {
    razorpayOrderId,
    valid
  });

  if (!valid) {
    logWorkflow("payment_verify_failed", { reason: "invalid_signature" }, "error");
    return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
  }

  const { data } = await db
    .from("orders")
    .select("*")
    .eq("razorpay_order_id", razorpayOrderId)
    .maybeSingle();

  const order = (data as Order) ?? null;

  if (order && order.user_id !== user.id) {
    logWorkflow(
      "payment_verify_failed",
      { reason: "forbidden", orderId: order.id, userId: user.id },
      "error"
    );
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  const result = await confirmCapturedRazorpayPayment(
    db,
    order,
    razorpayPaymentId,
    razorpayOrderId
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  logWorkflow(result.alreadyPaid ? "payment_verify_idempotent" : "payment_verify_success", {
    orderId: result.order.id,
    orderNumber: result.order.order_number,
    status: result.order.status,
    paymentStatus: result.order.payment_status,
    paymentId: result.order.razorpay_payment_id ?? razorpayPaymentId
  });

  return NextResponse.json({
    success: true,
    orderNumber: result.order.order_number,
    orderId: result.order.id,
    invoiceNumber: generateInvoiceNumber(result.order.order_number),
    paymentId: result.order.razorpay_payment_id ?? razorpayPaymentId,
    amountPaid: result.order.total,
    status: result.order.status
  });
}
