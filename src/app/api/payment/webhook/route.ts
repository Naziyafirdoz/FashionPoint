import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { confirmCapturedRazorpayPayment } from "@/lib/checkout/confirm-razorpay-payment";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { hydrateShippingSettings } from "@/lib/shipping/settings-store";
import { logWorkflow } from "@/lib/orders/workflow-logger";
import type { Order } from "@/types";

const HANDLED_EVENTS = new Set(["payment.captured", "order.paid", "payment.failed"]);

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function payloadEntity(payload: Record<string, unknown> | null, key: string): Record<string, unknown> | null {
  const section = asRecord(payload?.[key]);
  return asRecord(section?.entity);
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    logWorkflow("payment_webhook_failed", { reason: "invalid_signature" }, "error");
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  let eventBody: Record<string, unknown>;
  try {
    eventBody = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = String(eventBody.event ?? "");
  if (!HANDLED_EVENTS.has(event)) {
    return NextResponse.json({ received: true, ignored: event });
  }

  await hydrateShippingSettings();

  const db = createServiceClient();
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const payload = asRecord(eventBody.payload);
  const paymentEntity = payloadEntity(payload, "payment");
  const orderEntity = payloadEntity(payload, "order");

  const razorpayOrderId = String(
    paymentEntity?.order_id ?? orderEntity?.id ?? ""
  ).trim();
  const razorpayPaymentId = String(paymentEntity?.id ?? "").trim();

  if (!razorpayOrderId) {
    logWorkflow("payment_webhook_failed", { reason: "missing_order_id", event }, "warn");
    return NextResponse.json({ received: true, ignored: "missing_order_id" });
  }

  const { data } = await db
    .from("orders")
    .select("*")
    .eq("razorpay_order_id", razorpayOrderId)
    .maybeSingle();

  const order = (data as Order) ?? null;
  if (!order) {
    logWorkflow("payment_webhook_failed", { reason: "order_not_found", event, razorpayOrderId }, "warn");
    return NextResponse.json({ received: true, ignored: "order_not_found" });
  }

  if (event === "payment.failed") {
    if (order.payment_status === "paid") {
      return NextResponse.json({ received: true, ignored: "already_paid" });
    }

    if (order.payment_status === "pending") {
      const description = String(paymentEntity?.error_description ?? "Payment failed").slice(0, 500);
      await db
        .from("orders")
        .update({
          payment_status: "failed",
          notes: description,
          updated_at: new Date().toISOString()
        })
        .eq("id", order.id)
        .eq("payment_status", "pending");
    }

    logWorkflow("payment_webhook_failed", {
      orderId: order.id,
      orderNumber: order.order_number,
      event
    });
    return NextResponse.json({ received: true });
  }

  if (!razorpayPaymentId) {
    logWorkflow("payment_webhook_failed", { reason: "missing_payment_id", event }, "warn");
    return NextResponse.json({ received: true, ignored: "missing_payment_id" });
  }

  const result = await confirmCapturedRazorpayPayment(
    db,
    order,
    razorpayPaymentId,
    razorpayOrderId
  );

  if (!result.ok) {
    logWorkflow(
      "payment_webhook_failed",
      { orderId: order.id, orderNumber: order.order_number, event, error: result.error },
      "error"
    );
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  logWorkflow(result.alreadyPaid ? "payment_webhook_idempotent" : "payment_webhook_success", {
    orderId: result.order.id,
    orderNumber: result.order.order_number,
    event
  });

  return NextResponse.json({ received: true, orderId: result.order.id });
}
