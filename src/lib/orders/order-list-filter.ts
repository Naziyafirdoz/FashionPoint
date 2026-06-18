import type { Order, OrderStatus } from "@/types";
import {
  isCancelledAwaitingRefund,
  isCancelledRefunded
} from "@/lib/orders/cancellation";
import { ORDER_STATUSES } from "@/lib/orders/admin-orders";

export type OrderListFilter =
  | { kind: "all" }
  | { kind: "status"; status: OrderStatus }
  | { kind: "new_orders" }
  | { kind: "payment_status"; payment_status: string }
  | { kind: "cancelled_awaiting_refund" }
  | { kind: "cancelled_refunded" }
  | { kind: "returns" };

const ORDER_STATUS_SET = new Set<string>(ORDER_STATUSES);

const TAB_ALIASES: Record<string, string> = {
  refunds: "refund_pending",
  refund_pending: "refund_pending",
  refunded: "refunded",
  refund_required: "cancelled_awaiting_refund"
};

/** Maps `?tab=` / `?status=` query values to a server-side filter. */
export function resolveOrderListFilter(param: string | null | undefined): OrderListFilter {
  const value = (param ?? "all").trim().toLowerCase();
  if (!value || value === "all") return { kind: "all" };
  if (value === "returns") return { kind: "returns" };
  if (value === "new_orders") return { kind: "new_orders" };
  if (value === "cancelled_awaiting_refund" || value === "refund_required") {
    return { kind: "cancelled_awaiting_refund" };
  }
  if (value === "cancelled_refunded") {
    return { kind: "cancelled_refunded" };
  }

  const paymentStatus = TAB_ALIASES[value];
  if (paymentStatus) {
    return { kind: "payment_status", payment_status: paymentStatus };
  }

  if (ORDER_STATUS_SET.has(value)) {
    return { kind: "status", status: value as OrderStatus };
  }

  return { kind: "all" };
}

export function matchesOrderListFilter(
  order: Pick<Order, "status" | "payment_status" | "payment_method" | "refund_status">,
  filter: OrderListFilter
): boolean {
  if (filter.kind === "all") return true;
  if (filter.kind === "new_orders") {
    return order.status === "pending" || order.status === "processing";
  }
  if (filter.kind === "status") return order.status === filter.status;
  if (filter.kind === "cancelled_awaiting_refund") {
    return isCancelledAwaitingRefund(order);
  }
  if (filter.kind === "cancelled_refunded") {
    return isCancelledRefunded(order);
  }
  if (filter.kind === "payment_status") {
    return (order.payment_status ?? "").toLowerCase() === filter.payment_status;
  }
  return true;
}

export function isCancelledOrdersView(tab: string): boolean {
  return (
    tab === "cancelled" ||
    tab === "cancelled_awaiting_refund" ||
    tab === "cancelled_refunded" ||
    tab === "refund_required"
  );
}
