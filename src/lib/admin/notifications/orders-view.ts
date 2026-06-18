import {
  customerEmail,
  customerName,
  customerPhone,
  type OrderListRow
} from "@/lib/orders/admin-orders";
import { applyPaymentRulesToOrder } from "@/lib/orders/payment-rules";
import {
  matchesOrderListFilter,
  resolveOrderListFilter,
  type OrderListFilter
} from "@/lib/orders/order-list-filter";
import type { Order } from "@/types";

export function orderMatchesPaymentFilter(order: Order, paymentFilter: string): boolean {
  if (paymentFilter === "all") return true;
  return (order.payment_method ?? "").toLowerCase() === paymentFilter.toLowerCase();
}

export function orderMatchesSearch(order: Order, search: string): boolean {
  const term = search.trim().toLowerCase();
  if (!term) return true;
  return (
    order.order_number.toLowerCase().includes(term) ||
    customerName(order).toLowerCase().includes(term) ||
    customerEmail(order).toLowerCase().includes(term) ||
    customerPhone(order).toLowerCase().includes(term)
  );
}

export function orderMatchesOrdersView(
  order: Order,
  options: {
    statusFilter: string;
    paymentFilter: string;
    search: string;
  }
): boolean {
  const normalized = applyPaymentRulesToOrder(order);
  const filter: OrderListFilter = resolveOrderListFilter(options.statusFilter);
  return (
    matchesOrderListFilter(normalized, filter) &&
    orderMatchesPaymentFilter(normalized, options.paymentFilter) &&
    orderMatchesSearch(normalized, options.search)
  );
}

export function toOrderListRow(order: Order): OrderListRow {
  return applyPaymentRulesToOrder(order) as OrderListRow;
}
