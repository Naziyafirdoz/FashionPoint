import { filterOrdersByStoreRange } from "@/lib/admin/store-analytics";
import type { AIGrowthDateFilter } from "@/components/admin/ai-growth/ai-growth-shared";
import type { Order, OrderStatus, PaymentStatus } from "@/types";

const REVENUE_EXCLUDED: Set<OrderStatus> = new Set(["cancelled", "returned"]);

const CANCELLED_STATUSES: Set<OrderStatus> = new Set([
  "cancelled",
  "cancel_requested",
  "cancellation_approved",
  "returned"
]);

const ORDER_STATUS_GROUPS: { key: string; label: string; statuses: OrderStatus[] }[] = [
  { key: "processing", label: "Processing", statuses: ["processing", "pending"] },
  { key: "confirmed", label: "Confirmed", statuses: ["confirmed"] },
  { key: "packed", label: "Packed", statuses: ["packed", "packing_assigned"] },
  { key: "ready_to_ship", label: "Ready for Shipping", statuses: ["ready_to_ship"] },
  { key: "shipped", label: "Shipped", statuses: ["shipped", "out_for_delivery"] },
  { key: "delivered", label: "Delivered", statuses: ["delivered"] },
  { key: "cancelled", label: "Cancelled", statuses: ["cancelled", "cancel_requested", "cancellation_approved"] },
  { key: "returned", label: "Returned", statuses: ["returned"] }
];

const FULFILLMENT_PIPELINE_KEYS = [
  "processing",
  "confirmed",
  "packed",
  "ready_to_ship",
  "shipped",
  "delivered"
] as const;

const PAYMENT_STATUS_GROUPS: { key: PaymentStatus; label: string; statuses: PaymentStatus[] }[] = [
  { key: "paid", label: "Paid", statuses: ["paid"] },
  { key: "pending", label: "Pending", statuses: ["pending", "refund_pending"] },
  { key: "failed", label: "Failed", statuses: ["failed"] },
  { key: "refunded", label: "Refunded", statuses: ["refunded"] }
];

export type StatusCountRow = {
  key: string;
  label: string;
  count: number;
};

export type OrderDayRow = {
  key: string;
  label: string;
  orders: number;
  revenue: number;
};

export type ConversionInsight = {
  id: string;
  tone: "success" | "warning" | "info";
  text: string;
};

export type ConversionIntelligenceSnapshot = {
  totalOrders: number;
  paidOrders: number;
  cancelledOrders: number;
  orderSuccessRate: number | null;
  orderStatusDistribution: StatusCountRow[];
  paymentStatusDistribution: StatusCountRow[];
  dailyOrderTrend: { label: string; orders: number }[];
  cancellationCount: number;
  cancellationPercent: number | null;
  fulfillmentPipeline: StatusCountRow[];
  topOrderDays: OrderDayRow[];
  conversionInsights: ConversionInsight[];
  hasPeriodOrders: boolean;
};

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDayLabel(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short"
  });
}

function formatDayHighlightLabel(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function formatCurrencyForInsight(value: number): string {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function countCalendarDaysInWindow(start: Date, end: Date): number {
  const startDay = new Date(start);
  startDay.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.floor((endDay.getTime() - startDay.getTime()) / msPerDay) + 1);
}

function getCurrentPeriodWindow(filter: AIGrowthDateFilter): { start: Date; end: Date } {
  const now = new Date();

  switch (filter) {
    case "today":
      return { start: new Date(now.getFullYear(), now.getMonth(), now.getDate()), end: now };
    case "7d": {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    }
    case "30d": {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    }
    case "90d": {
      const start = new Date(now);
      start.setDate(start.getDate() - 90);
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    }
    case "year":
      return { start: new Date(now.getFullYear(), 0, 1), end: now };
    default:
      return { start: new Date(0), end: now };
  }
}

function orderRevenue(order: Order): number {
  if (REVENUE_EXCLUDED.has(order.status)) return 0;
  return Number(order.total) || 0;
}

function isCancelledOrder(order: Order): boolean {
  return CANCELLED_STATUSES.has(order.status);
}

function countByStatusGroups(
  orders: Order[],
  groups: { key: string; label: string; statuses: OrderStatus[] }[]
): StatusCountRow[] {
  const statusCounts = new Map<OrderStatus, number>();
  for (const order of orders) {
    statusCounts.set(order.status, (statusCounts.get(order.status) ?? 0) + 1);
  }

  return groups
    .map(({ key, label, statuses }) => ({
      key,
      label,
      count: statuses.reduce((sum, status) => sum + (statusCounts.get(status) ?? 0), 0)
    }))
    .filter((row) => row.count > 0);
}

function countByPaymentGroups(orders: Order[]): StatusCountRow[] {
  const paymentCounts = new Map<PaymentStatus, number>();
  for (const order of orders) {
    paymentCounts.set(order.payment_status, (paymentCounts.get(order.payment_status) ?? 0) + 1);
  }

  return PAYMENT_STATUS_GROUPS.map(({ key, label, statuses }) => ({
    key,
    label,
    count: statuses.reduce((sum, status) => sum + (paymentCounts.get(status) ?? 0), 0)
  })).filter((row) => row.count > 0);
}

function buildDailyOrderTrend(orders: Order[]): { label: string; orders: number }[] {
  const buckets = new Map<string, number>();

  for (const order of orders) {
    const key = dayKey(order.created_at);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => ({
      label: formatDayLabel(key),
      orders: count
    }));
}

function buildOrderDayRows(orders: Order[]): OrderDayRow[] {
  const buckets = new Map<string, { orders: number; revenue: number }>();

  for (const order of orders) {
    const key = dayKey(order.created_at);
    const entry = buckets.get(key) ?? { orders: 0, revenue: 0 };
    entry.orders += 1;
    entry.revenue += orderRevenue(order);
    buckets.set(key, entry);
  }

  return [...buckets.entries()]
    .map(([key, data]) => ({
      key,
      label: formatDayHighlightLabel(key),
      orders: data.orders,
      revenue: data.revenue
    }))
    .sort((a, b) => {
      if (b.orders !== a.orders) return b.orders - a.orders;
      return b.revenue - a.revenue;
    });
}

function buildConversionInsights(input: {
  totalOrders: number;
  paidOrders: number;
  cancelledOrders: number;
  deliveredOrders: number;
  topOrderDay: OrderDayRow | null;
  latestOrderDay: OrderDayRow | null;
  calendarDaysInPeriod: number;
}): ConversionInsight[] {
  const insights: ConversionInsight[] = [];

  if (input.totalOrders > 0) {
    insights.push({
      id: "orders-in-period",
      tone: "info",
      text: `Orders in selected period: ${input.totalOrders}.`
    });
  }

  if (input.totalOrders > 0) {
    const paidPercent = Math.round((input.paidOrders / input.totalOrders) * 100);
    insights.push({
      id: "paid-orders",
      tone: "info",
      text: `Paid orders: ${input.paidOrders} (${paidPercent}%).`
    });
  }

  if (input.totalOrders > 0 && input.cancelledOrders > 0) {
    const cancelledPercent = Math.round((input.cancelledOrders / input.totalOrders) * 100);
    insights.push({
      id: "cancelled-orders",
      tone: "warning",
      text: `Cancelled orders: ${input.cancelledOrders} (${cancelledPercent}%).`
    });
  }

  if (input.deliveredOrders > 0) {
    insights.push({
      id: "delivered-orders",
      tone: "info",
      text: `Delivered orders: ${input.deliveredOrders}.`
    });
  }

  if (input.topOrderDay && input.topOrderDay.orders > 0) {
    insights.push({
      id: "top-order-day",
      tone: "info",
      text: `Top order day ${input.topOrderDay.label}: ${input.topOrderDay.orders} orders, ${formatCurrencyForInsight(input.topOrderDay.revenue)}.`
    });
  }

  if (input.totalOrders > 0 && input.calendarDaysInPeriod > 0) {
    const averageOrdersPerDay = input.totalOrders / input.calendarDaysInPeriod;
    insights.push({
      id: "average-orders-per-day",
      tone: "info",
      text: `Average orders per day: ${averageOrdersPerDay.toFixed(1)}.`
    });
  }

  if (input.latestOrderDay && input.latestOrderDay.orders > 0) {
    insights.push({
      id: "latest-order-day",
      tone: "info",
      text: `Latest day ${input.latestOrderDay.label}: ${input.latestOrderDay.orders} orders.`
    });
  }

  if (input.totalOrders > 0) {
    const paymentSuccessRate = Math.round((input.paidOrders / input.totalOrders) * 100);
    insights.push({
      id: "payment-success-rate",
      tone: paymentSuccessRate >= 50 ? "success" : "warning",
      text: `Payment success rate: ${paymentSuccessRate}%.`
    });
  }

  if (input.totalOrders > 0 && input.deliveredOrders >= 0) {
    const fulfillmentRate = Math.round((input.deliveredOrders / input.totalOrders) * 100);
    insights.push({
      id: "fulfillment-completion-rate",
      tone: "info",
      text: `Fulfillment completion rate: ${fulfillmentRate}% (${input.deliveredOrders} delivered ÷ ${input.totalOrders} total orders).`
    });
  }

  return insights;
}

export function computeConversionIntelligence(
  orders: Order[],
  filter: AIGrowthDateFilter
): ConversionIntelligenceSnapshot {
  const periodOrders = filterOrdersByStoreRange(orders, filter);
  const totalOrders = periodOrders.length;
  const paidOrders = periodOrders.filter((order) => order.payment_status === "paid").length;
  const cancelledOrders = periodOrders.filter(isCancelledOrder).length;
  const deliveredOrders = periodOrders.filter((order) => order.status === "delivered").length;

  const orderSuccessRate =
    totalOrders > 0 ? Math.round((paidOrders / totalOrders) * 100) : null;

  const orderStatusDistribution = countByStatusGroups(periodOrders, ORDER_STATUS_GROUPS);
  const paymentStatusDistribution = countByPaymentGroups(periodOrders);
  const dailyOrderTrend = buildDailyOrderTrend(periodOrders);

  const cancellationPercent =
    totalOrders > 0 && cancelledOrders > 0
      ? Math.round((cancelledOrders / totalOrders) * 100)
      : null;

  const fulfillmentPipeline = countByStatusGroups(periodOrders, ORDER_STATUS_GROUPS).filter((row) =>
    (FULFILLMENT_PIPELINE_KEYS as readonly string[]).includes(row.key)
  );

  const orderDayRows = buildOrderDayRows(periodOrders);
  const topOrderDays = orderDayRows.slice(0, 10);
  const topOrderDay = orderDayRows[0] ?? null;
  const latestOrderDay =
    orderDayRows.length > 0
      ? [...orderDayRows].sort((a, b) => a.key.localeCompare(b.key)).at(-1) ?? null
      : null;

  const periodWindow = getCurrentPeriodWindow(filter);
  const calendarDaysInPeriod = countCalendarDaysInWindow(periodWindow.start, periodWindow.end);

  const conversionInsights = buildConversionInsights({
    totalOrders,
    paidOrders,
    cancelledOrders,
    deliveredOrders,
    topOrderDay,
    latestOrderDay,
    calendarDaysInPeriod
  });

  return {
    totalOrders,
    paidOrders,
    cancelledOrders,
    orderSuccessRate,
    orderStatusDistribution,
    paymentStatusDistribution,
    dailyOrderTrend,
    cancellationCount: cancelledOrders,
    cancellationPercent,
    fulfillmentPipeline,
    topOrderDays,
    conversionInsights,
    hasPeriodOrders: totalOrders > 0
  };
}
