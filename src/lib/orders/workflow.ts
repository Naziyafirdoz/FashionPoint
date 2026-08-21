import type { Order, OrderStatus } from "@/types";
import { normalizeLegacyStatus, orderStatusLabel } from "@/lib/orders/status-config";

export type PipelineStep = {
  key: string;
  label: string;
};

export const FULFILLMENT_PIPELINE: PipelineStep[] = [
  { key: "placed", label: "Order Placed" },
  { key: "processing", label: "Processing" },
  { key: "ready_to_ship", label: "Ready To Ship" },
  { key: "out_for_delivery", label: "Out For Delivery" },
  { key: "delivered", label: "Delivered" }
];

export type AdminOrdersTab =
  | "all"
  | "pending"
  | "processing"
  | "ready_to_ship"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "returns"
  | "refunds"
  | "refunded";

export const ADMIN_ORDER_TABS: { id: AdminOrdersTab; label: string }[] = [
  { id: "all", label: "All Orders" },
  { id: "pending", label: "Pending" },
  { id: "processing", label: "Processing" },
  { id: "ready_to_ship", label: "Ready To Ship" },
  { id: "out_for_delivery", label: "Out For Delivery" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
  { id: "returns", label: "Returns" },
  { id: "refunds", label: "Refund Pending" },
  { id: "refunded", label: "Refunded" }
];

const STATUS_PROGRESS_INDEX: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  processing: 1,
  packing_assigned: 1,
  packed: 2,
  ready_to_ship: 3,
  shipped: 3,
  out_for_delivery: 4,
  delivered: 5,
  returned: 5,
  cancelled: -1,
  cod_verification: 1
};

export { orderStatusLabel };

export function getPipelineProgressIndex(order: Order): number {
  const status = normalizeLegacyStatus(order.status);
  return STATUS_PROGRESS_INDEX[status] ?? 0;
}

export function getPipelineSteps(order: Order): { step: PipelineStep; completed: boolean; current: boolean }[] {
  const progress = getPipelineProgressIndex(order);

  return FULFILLMENT_PIPELINE.map((step, index) => {
    if (order.status === "cancelled") {
      return { step, completed: index <= Math.max(0, progress), current: false };
    }
    return {
      step,
      completed: progress > index,
      current: progress === index
    };
  });
}

export function tabToStatusFilter(tab: AdminOrdersTab): OrderStatus | null {
  if (tab === "all" || tab === "returns" || tab === "refunds" || tab === "refunded") return null;
  return tab as OrderStatus;
}

export type OrderAdminAction =
  | "start_processing"
  | "pack"
  | "ship"
  | "mark_delivered"
  | "mark_refunded";

export function getAvailableAdminActions(order: Order): OrderAdminAction[] {
  const actions: OrderAdminAction[] = [];
  const status = normalizeLegacyStatus(order.status);
  if (status === "pending") actions.push("start_processing");
  if (status === "processing") actions.push("pack");
  if (status === "ready_to_ship") actions.push("ship");
  if (order.payment_status === "refund_pending") actions.push("mark_refunded");
  return actions;
}

export const CUSTOMER_CANCELLABLE_STATUSES: OrderStatus[] = [
  "pending",
  "processing",
  "ready_to_ship"
];

export function isCustomerCancellable(status: OrderStatus | string): boolean {
  return CUSTOMER_CANCELLABLE_STATUSES.includes(normalizeLegacyStatus(status));
}

export function returnDaysRemaining(order: Order, windowDays = 7): number | null {
  if (normalizeLegacyStatus(order.status) !== "delivered") return null;
  const deliveredAt = new Date(order.delivery_confirmed_at ?? order.updated_at ?? order.created_at);
  const deadline = new Date(deliveredAt);
  deadline.setDate(deadline.getDate() + windowDays);
  const ms = deadline.getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function generateDeliveryOtp(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}
