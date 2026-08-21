import type { SupabaseClient } from "@supabase/supabase-js";
import { amountToPaise } from "@/lib/checkout/totals";
import { isCodPayment, isPrepaidPayment } from "@/lib/orders/payment-rules";
import {
  buildApproveCancellationPayload,
  isCancelRequestedOrder,
  MANUAL_ORDER_STATUS,
  MANUAL_REFUND_STATUS
} from "@/lib/orders/manual-refund";
import { refundAmountForOrder } from "@/lib/orders/refunds";
import {
  createRazorpayPaymentRefund,
  fetchRazorpayPayment,
  fetchRazorpayRefund,
  fetchRazorpayRefundsForPayment,
  type RazorpayRefundSnapshot
} from "@/lib/razorpay";
import type { Order } from "@/types";

export const ORIGINAL_PAYMENT_REFUND_METHOD = "original_payment_method";

export function isRazorpayPrepaidMethod(method: string | undefined): boolean {
  if (!method || isCodPayment(method)) return false;
  return isPrepaidPayment(method);
}

export function hasStoredRazorpayRefundId(order: Pick<Order, "razorpay_refund_id">): boolean {
  return Boolean(order.razorpay_refund_id?.trim());
}

/** New prepaid cancellations refund via Razorpay original payment method. */
export function canUseRazorpayAutoRefund(order: Order): boolean {
  if (!isRazorpayPrepaidMethod(order.payment_method)) return false;
  if ((order.payment_status ?? "").toLowerCase() === "refunded") return false;
  const paymentId = order.razorpay_payment_id?.trim() ?? "";
  return paymentId.length > 0;
}

export function razorpayRefundIdempotencyKey(orderId: string): string {
  return `fp_refund_${orderId.replace(/-/g, "")}`;
}

export async function isRazorpayRefundIdColumnReady(db: SupabaseClient): Promise<boolean> {
  const { error } = await db.from("orders").select("razorpay_refund_id").limit(0);
  return !error;
}

function refundFailed(status: string): boolean {
  return status.toLowerCase() === "failed";
}

function refundProcessed(status: string): boolean {
  return status.toLowerCase() === "processed";
}

export function buildOriginalPaymentCancelDetails(): Record<string, unknown> {
  return {
    refund_method: ORIGINAL_PAYMENT_REFUND_METHOD,
    refund_upi_id: null,
    refund_bank_holder_name: null,
    refund_bank_account_number: null,
    refund_bank_ifsc: null,
    refund_bank_name: null,
    refund_qr_image_url: null
  };
}

export function buildRazorpayRefundPendingPayload(
  order: Order,
  refund: RazorpayRefundSnapshot
): Record<string, unknown> {
  return {
    ...buildApproveCancellationPayload(order),
    razorpay_refund_id: refund.id,
    refund_method: order.refund_method || ORIGINAL_PAYMENT_REFUND_METHOD
  };
}

export function buildRazorpayRefundCompletedPayload(
  order: Order,
  refund: RazorpayRefundSnapshot,
  adminUserId?: string
): Record<string, unknown> {
  const now = new Date().toISOString();
  const amount = refundAmountForOrder(order);
  return {
    status: "cancelled",
    payment_status: "refunded",
    refund_status: MANUAL_REFUND_STATUS.REFUNDED,
    refund_amount: amount,
    refund_date: now,
    refund_completed_at: now,
    razorpay_refund_id: refund.id,
    refund_initiated_at: order.refund_initiated_at ?? now,
    refunded_by: adminUserId || order.refunded_by || null,
    cancelled_at: order.cancelled_at ?? now,
    refund_method: order.refund_method || ORIGINAL_PAYMENT_REFUND_METHOD,
    updated_at: now
  };
}

type RefundProcessResult =
  | { ok: true; payload: Record<string, unknown>; refund: RazorpayRefundSnapshot; completed: boolean }
  | { ok: false; error: string; status: number };

function existingRefundForPayment(
  refunds: RazorpayRefundSnapshot[],
  paymentId: string
): RazorpayRefundSnapshot | null {
  const active = refunds.find(
    (refund) => refund.payment_id === paymentId && !refundFailed(refund.status)
  );
  return active ?? null;
}

export async function processRazorpayCancellationRefund(
  order: Order,
  options?: { adminUserId?: string }
): Promise<RefundProcessResult> {
  if (!isCancelRequestedOrder(order)) {
    return { ok: false, error: "This order is not awaiting cancellation approval.", status: 400 };
  }
  if (!canUseRazorpayAutoRefund(order)) {
    return { ok: false, error: "This order is not eligible for Razorpay refund.", status: 400 };
  }
  if ((order.payment_status ?? "").toLowerCase() === "refunded") {
    return { ok: false, error: "This order has already been refunded.", status: 400 };
  }

  const paymentId = order.razorpay_payment_id!.trim();
  const expectedPaise = amountToPaise(refundAmountForOrder(order));
  if (expectedPaise <= 0) {
    return { ok: false, error: "Refund amount is invalid.", status: 400 };
  }

  let payment;
  try {
    payment = await fetchRazorpayPayment(paymentId);
  } catch {
    return { ok: false, error: "Could not verify the payment with Razorpay.", status: 502 };
  }

  if (!payment) {
    return { ok: false, error: "Razorpay payment was not found.", status: 400 };
  }

  const storedOrderId = order.razorpay_order_id?.trim() ?? "";
  if (!storedOrderId || payment.order_id !== storedOrderId) {
    return { ok: false, error: "Razorpay payment does not belong to this order.", status: 400 };
  }

  if (payment.currency.toUpperCase() !== "INR") {
    return { ok: false, error: "Only INR Razorpay payments can be refunded automatically.", status: 400 };
  }

  const alreadyFullyRefunded =
    payment.refund_status === "full" ||
    payment.status === "refunded" ||
    payment.amount_refunded >= payment.amount;

  if (!alreadyFullyRefunded) {
    if (payment.status !== "captured" && !payment.captured) {
      return { ok: false, error: "Razorpay payment is not captured and cannot be refunded.", status: 409 };
    }
    if (payment.amount !== expectedPaise) {
      return { ok: false, error: "Refund amount does not match the captured Razorpay payment.", status: 400 };
    }
  }

  const storedRefundId = order.razorpay_refund_id?.trim() ?? "";
  if (storedRefundId) {
    try {
      const existing = await fetchRazorpayRefund(storedRefundId);
      if (existing && existing.payment_id === paymentId) {
        if (refundFailed(existing.status)) {
          return {
            ok: false,
            error: "The previous Razorpay refund failed. No second refund was created.",
            status: 409
          };
        }
        const payload = refundProcessed(existing.status)
          ? buildRazorpayRefundCompletedPayload(order, existing, options?.adminUserId)
          : buildRazorpayRefundPendingPayload(order, existing);
        return {
          ok: true,
          payload,
          refund: existing,
          completed: refundProcessed(existing.status)
        };
      }
    } catch {
      return { ok: false, error: "Could not verify the existing Razorpay refund.", status: 502 };
    }
  }

  if (alreadyFullyRefunded) {
    try {
      const refunds = await fetchRazorpayRefundsForPayment(paymentId);
      const existing = existingRefundForPayment(refunds, paymentId);
      if (!existing) {
        return {
          ok: false,
          error: "Razorpay shows this payment as refunded, but no refund record was found.",
          status: 409
        };
      }
      if (refundFailed(existing.status)) {
        return { ok: false, error: "The existing Razorpay refund failed.", status: 409 };
      }
      const payload = refundProcessed(existing.status)
        ? buildRazorpayRefundCompletedPayload(order, existing, options?.adminUserId)
        : buildRazorpayRefundPendingPayload(order, existing);
      return {
        ok: true,
        payload,
        refund: existing,
        completed: refundProcessed(existing.status)
      };
    } catch {
      return { ok: false, error: "Could not load existing Razorpay refunds.", status: 502 };
    }
  }

  const created = await createRazorpayPaymentRefund({
    paymentId,
    amountPaise: expectedPaise,
    idempotencyKey: razorpayRefundIdempotencyKey(order.id),
    receipt: `fp-cancel-${order.order_number}`.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40)
  });

  if (!created.ok) {
    return { ok: false, error: created.error, status: 502 };
  }

  if (refundFailed(created.refund.status)) {
    return {
      ok: false,
      error: "Razorpay did not accept this refund. The order was not marked as refunded.",
      status: 502
    };
  }

  const completed = refundProcessed(created.refund.status);
  const payload = completed
    ? buildRazorpayRefundCompletedPayload(order, created.refund, options?.adminUserId)
    : buildRazorpayRefundPendingPayload(order, created.refund);

  return { ok: true, payload, refund: created.refund, completed };
}

export function buildWebhookRazorpayRefundCompletePayload(
  order: Order,
  refund: Pick<RazorpayRefundSnapshot, "id">
): Record<string, unknown> {
  const now = new Date().toISOString();
  const amount = refundAmountForOrder(order);
  return {
    status: "cancelled" as const,
    payment_status: "refunded",
    refund_status: MANUAL_REFUND_STATUS.REFUNDED,
    refund_amount: amount,
    refund_date: now,
    refund_completed_at: now,
    razorpay_refund_id: refund.id,
    refund_initiated_at: order.refund_initiated_at ?? now,
    cancelled_at: order.cancelled_at ?? now,
    refund_method: order.refund_method || ORIGINAL_PAYMENT_REFUND_METHOD,
    updated_at: now
  };
}

export function orderCanCompleteRazorpayRefundFromWebhook(order: Order): boolean {
  const status = order.status as string;
  const payment = (order.payment_status ?? "").toLowerCase();
  if (payment === "refunded" || status === "cancelled") return false;
  return (
    status === MANUAL_ORDER_STATUS.CANCEL_REQUESTED ||
    status === MANUAL_ORDER_STATUS.CANCELLATION_APPROVED ||
    payment === "refund_pending"
  );
}
