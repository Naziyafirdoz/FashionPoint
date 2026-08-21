/**
 * @deprecated Refund queue UI is disabled. Stats helpers remain for legacy data only.
 * Returns, exchanges, and refund workflows are intentionally disabled per client requirements.
 */
import type { Order, ReturnRequest } from "@/types";
import { countPendingCancellationRequests } from "@/lib/orders/cancellation-requests";
import { requiresCustomerCancellationRefund } from "@/lib/orders/cancellation";
import {
  refundAmountForOrder,
  resolveExpectedRefundDate as resolveExpectedFromOrder
} from "@/lib/orders/refunds";
import { isPrepaidPayment } from "@/lib/orders/payment-rules";

export type RefundQueueItem = {
  order: Order;
  customerName: string;
  refundAmount: number;
  refundInitiated: string | null;
  expectedRefundDate: string | null;
  isOverdue: boolean;
  isDueToday: boolean;
};

export type RefundQueueSummary = {
  dueToday: number;
  overdue: number;
  upcoming: number;
  items: RefundQueueItem[];
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isSameDay(a: Date, b: Date) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

export function resolveExpectedRefundDate(order: Order): string | null {
  return resolveExpectedFromOrder(order);
}

export function isRefundOverdue(order: Order): boolean {
  if (order.payment_status === "refunded") return false;
  if (order.payment_status !== "refund_pending") return false;
  const expected = resolveExpectedRefundDate(order);
  if (!expected) return false;
  return startOfDay(new Date()) > startOfDay(new Date(expected));
}

export function isRefundDueToday(order: Order): boolean {
  if (order.payment_status !== "refund_pending") return false;
  const expected = resolveExpectedRefundDate(order);
  if (!expected) return false;
  return isSameDay(new Date(), new Date(expected));
}

export function customerDisplayName(order: Order): string {
  return order.shipping_address?.name ?? order.guest_email ?? "Customer";
}

export function buildRefundQueue(orders: Order[]): RefundQueueSummary {
  const pending = orders.filter(
    (o) =>
      isPrepaidPayment(o.payment_method) &&
      o.payment_status === "refund_pending"
  );

  const items: RefundQueueItem[] = pending.map((order) => {
    const expectedRefundDate = resolveExpectedRefundDate(order);
    const overdue = isRefundOverdue(order);
    const dueToday = isRefundDueToday(order);
    return {
      order,
      customerName: customerDisplayName(order),
      refundAmount: refundAmountForOrder(order),
      refundInitiated: order.refund_initiated_at ?? null,
      expectedRefundDate,
      isOverdue: overdue,
      isDueToday: dueToday && !overdue
    };
  });

  items.sort((a, b) => {
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
    if (a.isDueToday !== b.isDueToday) return a.isDueToday ? -1 : 1;
    const aDate = a.expectedRefundDate ? new Date(a.expectedRefundDate).getTime() : Infinity;
    const bDate = b.expectedRefundDate ? new Date(b.expectedRefundDate).getTime() : Infinity;
    return aDate - bDate;
  });

  return {
    dueToday: items.filter((i) => i.isDueToday).length,
    overdue: items.filter((i) => i.isOverdue).length,
    upcoming: items.filter((i) => !i.isDueToday && !i.isOverdue).length,
    items
  };
}

export type AdminOrderStatsV2 = {
  total: number;
  pending: number;
  processing: number;
  readyToShip: number;
  shipped: number;
  outForDelivery: number;
  delivered: number;
  cancelled: number;
  pendingCancellations: number;
  refundPending: number;
  refunded: number;
  customerCancellationRefunds: number;
  returnRequests: number;
  returnsApproved: number;
  overdueRefunds: number;
};

export function computeAdminOrderStatsV2(
  orders: Order[],
  returnRequests: ReturnRequest[]
): AdminOrderStatsV2 {
  const stats: AdminOrderStatsV2 = {
    total: orders.length,
    pending: 0,
    processing: 0,
    readyToShip: 0,
    shipped: 0,
    outForDelivery: 0,
    delivered: 0,
    cancelled: 0,
    pendingCancellations: 0,
    refundPending: 0,
    refunded: 0,
    customerCancellationRefunds: 0,
    returnRequests: returnRequests.length,
    returnsApproved: 0,
    overdueRefunds: 0
  };

  for (const o of orders) {
    const raw = o.status as string;
    const status = raw === "cod_verification" ? "processing" : o.status;
    if (status === "pending") stats.pending++;
    if (status === "processing") stats.processing++;
    if (status === "ready_to_ship") stats.readyToShip++;
    if (status === "shipped") stats.shipped++;
    if (status === "out_for_delivery") stats.outForDelivery++;
    if (status === "delivered") stats.delivered++;
    if (status === "cancelled") stats.cancelled++;
    if (o.payment_status === "refund_pending") stats.refundPending++;
    if (o.payment_status === "refunded") stats.refunded++;
    if (requiresCustomerCancellationRefund(o)) stats.customerCancellationRefunds++;
    if (isRefundOverdue(o)) stats.overdueRefunds++;
  }

  for (const r of returnRequests) {
    if (r.status === "return_approved" || r.status === "pickup_scheduled" || r.status === "returned") {
      stats.returnsApproved++;
    }
  }

  stats.pendingCancellations = countPendingCancellationRequests(orders);

  return stats;
}
