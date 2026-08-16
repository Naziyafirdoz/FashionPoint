import type { SupabaseClient } from "@supabase/supabase-js";
import { amountToPaise } from "@/lib/checkout/totals";
import { finalizePaidOrder } from "@/lib/checkout/finalize-paid-order";
import { fetchRazorpayPayment } from "@/lib/razorpay";
import { logWorkflow } from "@/lib/orders/workflow-logger";
import type { Order } from "@/types";

export type ConfirmRazorpayResult =
  | { ok: true; order: Order; alreadyPaid: boolean }
  | { ok: false; error: string; status: number };

function expectedPaise(order: Order): number {
  return amountToPaise(Number(order.total));
}

export async function confirmCapturedRazorpayPayment(
  db: SupabaseClient,
  order: Order,
  razorpayPaymentId: string,
  razorpayOrderId: string
): Promise<ConfirmRazorpayResult> {
  if (order.payment_status === "paid") {
    return { ok: true, order, alreadyPaid: true };
  }

  if (order.payment_status !== "pending" && order.payment_status !== "failed") {
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
    return { ok: false, error: "Order is not awaiting payment", status: 409 };
  }

  const storedOrderId = order.razorpay_order_id?.trim() ?? "";
  if (!storedOrderId || storedOrderId !== razorpayOrderId) {
    logWorkflow(
      "payment_verify_failed",
      {
        orderId: order.id,
        orderNumber: order.order_number,
        reason: "razorpay_order_mismatch"
      },
      "error"
    );
    return { ok: false, error: "Payment does not belong to this order", status: 400 };
  }

  let payment;
  try {
    payment = await fetchRazorpayPayment(razorpayPaymentId);
  } catch (error) {
    logWorkflow(
      "payment_verify_failed",
      {
        orderId: order.id,
        orderNumber: order.order_number,
        reason: "razorpay_fetch_failed",
        error: error instanceof Error ? error.message : String(error)
      },
      "error"
    );
    return { ok: false, error: "Could not confirm payment with Razorpay", status: 502 };
  }

  if (!payment) {
    return { ok: false, error: "Payment not found", status: 400 };
  }

  if (payment.order_id !== razorpayOrderId || payment.order_id !== storedOrderId) {
    logWorkflow(
      "payment_verify_failed",
      {
        orderId: order.id,
        orderNumber: order.order_number,
        reason: "payment_order_mismatch"
      },
      "error"
    );
    return { ok: false, error: "Payment does not belong to this order", status: 400 };
  }

  if (payment.status !== "captured") {
    logWorkflow(
      "payment_verify_failed",
      {
        orderId: order.id,
        orderNumber: order.order_number,
        reason: "payment_not_captured",
        razorpayStatus: payment.status
      },
      "warn"
    );
    return { ok: false, error: "Payment has not been captured", status: 409 };
  }

  if (payment.currency.toUpperCase() !== "INR" || payment.amount !== expectedPaise(order)) {
    logWorkflow(
      "payment_verify_failed",
      {
        orderId: order.id,
        orderNumber: order.order_number,
        reason: "amount_mismatch",
        expectedPaise: expectedPaise(order),
        receivedPaise: payment.amount,
        currency: payment.currency
      },
      "error"
    );
    return { ok: false, error: "Payment amount does not match this order", status: 400 };
  }

  try {
    const finalized = await finalizePaidOrder(db, order, {
      razorpayPaymentId: payment.id
    });
    return { ok: true, order: finalized, alreadyPaid: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payment confirmation failed";
    logWorkflow(
      "payment_verify_failed",
      { orderId: order.id, orderNumber: order.order_number, error: message },
      "error"
    );
    const status = message.toLowerCase().includes("stock") ? 409 : 500;
    return { ok: false, error: message, status };
  }
}
