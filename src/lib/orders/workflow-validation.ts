import type { OrderStatus } from "@/types";
import { normalizeLegacyStatus, orderStatusLabel } from "@/lib/orders/status-config";

/**
 * Canonical fulfillment transitions (prepaid boutique ops).
 *
 * Main happy path:
 *   pending → processing → confirmed → ready_to_ship
 *   → shipped (Rapido/DTDC) | out_for_delivery (Delivery Boy) → delivered
 *
 * Legacy packing path (kept for in-flight / historical orders):
 *   confirmed → packing_assigned → packed → ready_to_ship
 *
 * Notes:
 * - Approval sets `confirmed` (not ready_to_ship); admin then clicks Ready for Shipping.
 * - `pending` → `ready_to_ship` remains allowed for rare recovery paths.
 * - Cancellation statuses are handled separately (not listed here).
 */
export const ALLOWED_STATUS_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  pending: ["processing", "confirmed", "ready_to_ship"],
  processing: ["confirmed", "ready_to_ship"],
  confirmed: ["packing_assigned", "ready_to_ship"],
  packing_assigned: ["packed"],
  packed: ["ready_to_ship"],
  ready_to_ship: ["shipped", "out_for_delivery"],
  shipped: ["out_for_delivery", "delivered"],
  out_for_delivery: ["delivered"]
};

export type TransitionResult =
  | { ok: true }
  | { ok: false; message: string };

export function validateStatusTransition(
  fromStatus: string,
  toStatus: OrderStatus
): TransitionResult {
  const from = normalizeLegacyStatus(fromStatus);

  if (from === "cancelled" || from === "cancel_requested" || from === "cancellation_approved") {
    return { ok: false, message: "Cancelled orders cannot be updated." };
  }

  if (from === "delivered" && toStatus !== "delivered") {
    return {
      ok: false,
      message: "Delivered orders can only be updated for refunds — not status changes."
    };
  }

  if (from === toStatus) return { ok: true };

  const allowed = ALLOWED_STATUS_TRANSITIONS[from];
  if (!allowed?.includes(toStatus)) {
    return {
      ok: false,
      message: `Cannot change status from ${orderStatusLabel(from)} to ${orderStatusLabel(toStatus)}.`
    };
  }

  return { ok: true };
}

export function assertTransition(fromStatus: string, toStatus: OrderStatus): string | null {
  const from = normalizeLegacyStatus(fromStatus);
  const result = validateStatusTransition(from, toStatus);
  return result.ok ? null : result.message;
}

export function canRefundOrder(status: string, paymentStatus: string): boolean {
  const normalized = normalizeLegacyStatus(status);
  return (
    normalized === "delivered" &&
    (paymentStatus === "refund_pending" || paymentStatus === "paid")
  );
}

export function hasNoFurtherActions(status: string): boolean {
  const normalized = normalizeLegacyStatus(status);
  return normalized === "cancelled";
}
