import type { Order } from "@/types";
import type { OrderListRow } from "@/lib/orders/admin-orders";
import { getStageLabel, getStatusPillClass, normalizeLegacyStatus } from "@/lib/orders/status-config";
import { isCancellationRefundWorkflowEnabled, RETURNS_EXCHANGES_REFUNDS_DISABLED } from "@/lib/store-policy";

export const HIGH_VALUE_THRESHOLD = 5000;

export type OrderAgeTone = "fresh" | "pending" | "delayed";

export type PrimaryActionType =
  | "approve_order"
  | "start_processing"
  | "start_packing"
  | "mark_packed"
  | "ready_for_shipping"
  | "mark_shipped"
  | "mark_delivered"
  | "process_refund"
  | "view";

export type OrderPrimaryAction = {
  type: PrimaryActionType;
  label: string;
};

export { getStageLabel, getStatusPillClass as getStagePillClass };

export function formatOrderAge(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.floor(ms / 60_000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function orderAgeTone(order: Pick<Order, "created_at" | "status">): OrderAgeTone {
  const hours = (Date.now() - new Date(order.created_at).getTime()) / 3_600_000;
  const status = normalizeLegacyStatus(order.status);
  if (status === "delivered" || status === "cancelled") {
    return "fresh";
  }
  if (hours < 24) return "fresh";
  if (hours < 72) return "pending";
  return "delayed";
}

export function ageToneClass(tone: OrderAgeTone): string {
  if (tone === "fresh") return "text-emerald-700";
  if (tone === "pending") return "text-amber-700";
  return "text-red-700";
}

/** Delivery Staff OFD with assignee — staff completes via OTP; admin Mark Delivered is override-only. */
export function isAssignedDeliveryBoyOutForDelivery(
  order: Pick<Order, "status" | "fulfillment_method" | "assigned_delivery_worker_id">
): boolean {
  return (
    normalizeLegacyStatus(order.status) === "out_for_delivery" &&
    order.fulfillment_method === "delivery_boy" &&
    Boolean(order.assigned_delivery_worker_id?.trim())
  );
}

export function getPrimaryAction(order: OrderListRow): OrderPrimaryAction {
  if (
    (isCancellationRefundWorkflowEnabled() || !RETURNS_EXCHANGES_REFUNDS_DISABLED) &&
    order.payment_status === "refund_pending"
  ) {
    return { type: "process_refund", label: "Process Refund" };
  }
  const status = normalizeLegacyStatus(order.status);
  switch (status) {
    case "pending":
    case "processing":
      // Approval is email-only (new-order email → Approve Order).
      return { type: "view", label: "View" };
    case "confirmed":
      return { type: "ready_for_shipping", label: "Ready for Shipping" };
    case "packing_assigned":
      // Legacy in-flight packing orders only — not the normal admin path.
      return { type: "mark_packed", label: "Mark Packed" };
    case "packed":
      // Legacy in-flight packing orders only.
      return { type: "ready_for_shipping", label: "Ready for Shipping" };
    case "ready_to_ship":
      return { type: "mark_shipped", label: "Fulfill Order" };
    case "out_for_delivery":
      // Assigned Delivery Staff path: OTP completion is normal; do not primary-promote admin override.
      if (isAssignedDeliveryBoyOutForDelivery(order)) {
        return { type: "view", label: "View" };
      }
      return { type: "mark_delivered", label: "Mark Delivered" };
    case "shipped":
      return { type: "view", label: "View" };
    case "delivered":
      return { type: "view", label: "View" };
    default:
      return { type: "view", label: "View" };
  }
}

export function isHighValueOrder(total: number): boolean {
  return total >= HIGH_VALUE_THRESHOLD;
}

export function computeTodaySummary(orders: Order[]): { count: number; revenue: number } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const todayMs = start.getTime();
  let count = 0;
  let revenue = 0;
  for (const o of orders) {
    if (new Date(o.created_at).getTime() >= todayMs) {
      count++;
      revenue += Number(o.total) || 0;
    }
  }
  return { count, revenue };
}

export function filterOrdersByDateRange(
  orders: Order[],
  from: string | null,
  to: string | null
): Order[] {
  if (!from && !to) return orders;
  const fromMs = from ? new Date(from).setHours(0, 0, 0, 0) : 0;
  const toMs = to ? new Date(to).setHours(23, 59, 59, 999) : Infinity;
  return orders.filter((o) => {
    const t = new Date(o.created_at).getTime();
    return t >= fromMs && t <= toMs;
  });
}

export const PIPELINE_STAGES: { id: string; label: string }[] = [
  { id: "processing", label: "Processing" },
  { id: "confirmed", label: "Confirmed" },
  { id: "ready_to_ship", label: "Ready for Shipping" },
  { id: "shipped", label: "Shipped" },
  { id: "out_for_delivery", label: "Out for Delivery" },
  { id: "delivered", label: "Delivered" }
];

export function formatCurrencyCompact(amount: number): string {
  return `₹${Number(amount).toLocaleString("en-IN")}`;
}
