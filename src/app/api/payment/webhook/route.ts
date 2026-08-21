import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { confirmCapturedRazorpayPayment } from "@/lib/checkout/confirm-razorpay-payment";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { hydrateShippingSettings } from "@/lib/shipping/settings-store";
import { logWorkflow } from "@/lib/orders/workflow-logger";
import { persistOrderUpdate, normalizeOrderRecord } from "@/lib/orders/normalize-order";
import {
  buildWebhookRazorpayRefundCompletePayload,
  orderCanCompleteRazorpayRefundFromWebhook
} from "@/lib/orders/razorpay-cancel-refund";
import { sendCustomerRefundProcessedEmail } from "@/lib/server/notifications/refund-processed-email";
import type { Order } from "@/types";

const PAYMENT_EVENTS = new Set(["payment.captured", "order.paid", "payment.failed"]);
const REFUND_EVENTS = new Set(["refund.processed", "refund.failed"]);

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
  if (!PAYMENT_EVENTS.has(event) && !REFUND_EVENTS.has(event)) {
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
  const refundEntity = payloadEntity(payload, "refund");

  if (REFUND_EVENTS.has(event)) {
    const refundId = String(refundEntity?.id ?? "").trim();
    const refundPaymentId = String(refundEntity?.payment_id ?? paymentEntity?.id ?? "").trim();
    const refundStatus = String(refundEntity?.status ?? "").toLowerCase();

    let order: Order | null = null;
    if (refundId) {
      const byRefund = await db.from("orders").select("*").eq("razorpay_refund_id", refundId).maybeSingle();
      order = (byRefund.data as Order) ?? null;
    }
    if (!order && refundPaymentId) {
      const byPayment = await db
        .from("orders")
        .select("*")
        .eq("razorpay_payment_id", refundPaymentId)
        .maybeSingle();
      order = (byPayment.data as Order) ?? null;
    }

    if (!order) {
      logWorkflow("payment_webhook_failed", { reason: "refund_order_not_found", event, refundId }, "warn");
      return NextResponse.json({ received: true, ignored: "refund_order_not_found" });
    }

    if (event === "refund.failed" || refundStatus === "failed") {
      logWorkflow(
        "payment_webhook_failed",
        { orderId: order.id, orderNumber: order.order_number, event, refundId },
        "warn"
      );
      return NextResponse.json({ received: true, orderId: order.id, refund_failed: true });
    }

    if (!orderCanCompleteRazorpayRefundFromWebhook(order)) {
      return NextResponse.json({ received: true, ignored: "refund_not_applicable", orderId: order.id });
    }

    if (refundStatus && refundStatus !== "processed") {
      return NextResponse.json({ received: true, ignored: "refund_not_processed", orderId: order.id });
    }

    if (!refundId) {
      return NextResponse.json({ received: true, ignored: "missing_refund_id" });
    }

    const { order: updated, error } = await persistOrderUpdate(
      db,
      order.id,
      buildWebhookRazorpayRefundCompletePayload(order, { id: refundId })
    );
    if (error || !updated) {
      logWorkflow(
        "payment_webhook_failed",
        { orderId: order.id, event, error: error ?? "update_failed" },
        "error"
      );
      return NextResponse.json({ received: true, error: "refund_update_failed" }, { status: 500 });
    }

    const normalized = await normalizeOrderRecord(db, updated, { persist: true });
    void sendCustomerRefundProcessedEmail(normalized).catch(() => undefined);
    logWorkflow("payment_webhook_success", {
      orderId: normalized.id,
      orderNumber: normalized.order_number,
      event
    });
    return NextResponse.json({ received: true, orderId: normalized.id, refund_completed: true });
  }

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
