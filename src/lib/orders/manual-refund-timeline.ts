import { formatCurrency } from "@/lib/orders/admin-orders";
import {
  isManualRefundOrder,
  MANUAL_REFUND_STATUS,
  refundMethodLabel
} from "@/lib/orders/manual-refund";
import { refundAmountForOrder } from "@/lib/orders/refunds";
import { formatRefundDateTime } from "@/lib/orders/refunds";
import type { Order } from "@/types";

export type RefundAuditEntry = {
  id: string;
  label: string;
  at: string;
  details: string[];
};

function pushEntry(
  entries: RefundAuditEntry[],
  id: string,
  label: string,
  at: string | undefined | null,
  details: string[] = []
) {
  if (!at) return;
  entries.push({ id, label, at, details });
}

/** Manual prepaid cancellation/refund audit trail for admin order page. */
export function buildManualRefundAuditTimeline(order: Order): RefundAuditEntry[] {
  if (!isManualRefundOrder(order) && !order.refund_method) {
    return [];
  }

  const entries: RefundAuditEntry[] = [];
  const refundStatus = (order.refund_status ?? "").toLowerCase();
  const status = order.status as string;
  const amount = refundAmountForOrder(order);

  const cancelRequestedAt =
    order.cancel_requested_at ??
    (status === "cancel_requested" ? order.updated_at : null) ??
    (order.refund_method && refundStatus === MANUAL_REFUND_STATUS.DETAILS_SUBMITTED
      ? order.updated_at
      : null);

  if (cancelRequestedAt && order.refund_method) {
    pushEntry(entries, "cancel_requested", "Cancel Requested", cancelRequestedAt, [
      `Refund method: ${refundMethodLabel(order.refund_method)}`
    ]);
  }

  if (order.refund_initiated_at) {
    const approved =
      status === "cancellation_approved" ||
      status === "cancelled" ||
      refundStatus === MANUAL_REFUND_STATUS.PENDING ||
      refundStatus === MANUAL_REFUND_STATUS.REFUNDED;

    if (approved) {
      pushEntry(entries, "cancellation_approved", "Cancellation Approved", order.refund_initiated_at, [
        `Amount to refund: ${formatCurrency(amount)}`
      ]);
      pushEntry(entries, "refund_pending", "Refund Pending", order.refund_initiated_at, [
        "Awaiting manual transfer to customer"
      ]);
    }
  }

  const completedAt = order.refund_completed_at ?? order.refund_date;
  if (
    completedAt &&
    (refundStatus === MANUAL_REFUND_STATUS.REFUNDED ||
      order.payment_status === "refunded" ||
      status === "cancelled")
  ) {
    const completionDetails = [
      `Refunded amount: ${formatCurrency(amount)}`,
      `Refund date: ${formatRefundDateTime(completedAt)}`,
      order.refund_reference?.trim()
        ? `UTR Number: ${order.refund_reference.trim()}`
        : null,
      order.refunded_by ? "Refunded by: Store Admin" : null,
      order.refund_notes?.trim() ? `Notes: ${order.refund_notes.trim()}` : null
    ].filter((line): line is string => Boolean(line));

    pushEntry(entries, "refund_completed", "Refund Completed", completedAt, completionDetails);
  }

  if (status === "cancelled" && completedAt) {
    pushEntry(entries, "order_cancelled", "Order Cancelled", completedAt, [
      "Order marked cancelled after refund completion"
    ]);
  }

  return entries.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

export { formatRefundDateTime };
