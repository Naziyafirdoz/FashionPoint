import { normalizeLegacyStatus } from "@/lib/orders/status-config";
import { isPendingCancellationRequest } from "@/lib/orders/cancellation-requests";
import { requiresCustomerCancellationRefund } from "@/lib/orders/cancellation";
import type { AdminOrderStatsV2 } from "@/lib/orders/refund-queue";
import type { Order } from "@/types";

function bumpStatus(stats: AdminOrderStatsV2, status: string, delta: number) {
  const normalized = normalizeLegacyStatus(status);
  switch (normalized) {
    case "pending":
      stats.pending = Math.max(0, stats.pending + delta);
      break;
    case "processing":
      stats.processing = Math.max(0, stats.processing + delta);
      break;
    case "ready_to_ship":
      stats.readyToShip = Math.max(0, stats.readyToShip + delta);
      break;
    case "out_for_delivery":
      stats.outForDelivery = Math.max(0, stats.outForDelivery + delta);
      break;
    case "delivered":
      stats.delivered = Math.max(0, stats.delivered + delta);
      break;
    case "cancelled":
      stats.cancelled = Math.max(0, stats.cancelled + delta);
      break;
    default:
      break;
  }
}

function bumpPaymentStatus(stats: AdminOrderStatsV2, paymentStatus: string, delta: number) {
  const p = paymentStatus.toLowerCase();
  if (p === "refund_pending") {
    stats.refundPending = Math.max(0, stats.refundPending + delta);
  }
  if (p === "refunded") {
    stats.refunded = Math.max(0, stats.refunded + delta);
  }
}

function adjustCustomerCancellationRefunds(
  stats: AdminOrderStatsV2,
  wasRequired: boolean,
  isRequired: boolean
) {
  if (wasRequired === isRequired) return;
  stats.customerCancellationRefunds = Math.max(
    0,
    stats.customerCancellationRefunds + (isRequired ? 1 : -1)
  );
}

/** Apply incremental stats changes from an order insert or update. */
export function applyOrderStatsDelta(
  stats: AdminOrderStatsV2,
  next: Order,
  previous?: Order | null
): AdminOrderStatsV2 {
  const updated: AdminOrderStatsV2 = { ...stats };

  if (!previous) {
    updated.total = Math.max(0, updated.total + 1);
    bumpStatus(updated, next.status, 1);
    if ((next.payment_status ?? "").toLowerCase() === "refund_pending") {
      bumpPaymentStatus(updated, "refund_pending", 1);
    }
    if (isPendingCancellationRequest(next)) {
      updated.pendingCancellations = Math.max(0, updated.pendingCancellations + 1);
    }
    if (requiresCustomerCancellationRefund(next)) {
      updated.customerCancellationRefunds = Math.max(0, updated.customerCancellationRefunds + 1);
    }
    return updated;
  }

  const wasPendingCancellation = isPendingCancellationRequest(previous);
  const isPendingCancellation = isPendingCancellationRequest(next);
  if (wasPendingCancellation !== isPendingCancellation) {
    updated.pendingCancellations = Math.max(
      0,
      updated.pendingCancellations + (isPendingCancellation ? 1 : -1)
    );
  }

  adjustCustomerCancellationRefunds(
    updated,
    requiresCustomerCancellationRefund(previous),
    requiresCustomerCancellationRefund(next)
  );

  if (previous.status !== next.status) {
    bumpStatus(updated, previous.status, -1);
    bumpStatus(updated, next.status, 1);
  }

  const prevPayment = (previous.payment_status ?? "").toLowerCase();
  const nextPayment = (next.payment_status ?? "").toLowerCase();
  if (prevPayment !== nextPayment) {
    bumpPaymentStatus(updated, prevPayment, -1);
    bumpPaymentStatus(updated, nextPayment, 1);
  }

  return updated;
}
