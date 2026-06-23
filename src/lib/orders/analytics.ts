import type { Order, OrderStatus } from "@/types";
import { isVijayawadaDelivery } from "@/lib/shipping/city-detection";
import { normalizeOrderItems } from "@/lib/orders/order-items";
import { orderStatusLabel } from "@/lib/orders/status-config";

const REVENUE_EXCLUDED: Set<OrderStatus> = new Set(["cancelled", "returned"]);

export type OrderAnalyticsSummary = {
  totalOrders: number;
  revenue: number;
  averageOrderValue: number;
  pendingOrders: number;
  processingOrders: number;
  outForDeliveryOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
};

export type MonthlyOrderPoint = {
  month: string;
  label: string;
  orders: number;
  revenue: number;
};

export type StatusDistributionPoint = {
  status: string;
  label: string;
  count: number;
};

export type TopSellingProduct = {
  productId: string;
  name: string;
  image?: string;
  ordersCount: number;
  revenue: number;
};

export type DeliveryInsights = {
  local: { orders: number; revenue: number };
  outstation: { orders: number; revenue: number };
};

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric"
  });
}

export type AnalyticsDateRange = 3 | 6 | 12 | 0;

export function filterOrdersByDateRange(orders: Order[], range: AnalyticsDateRange): Order[] {
  if (range === 0) return orders;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - range);
  cutoff.setHours(0, 0, 0, 0);
  return orders.filter((o) => new Date(o.created_at) >= cutoff);
}

export function sliceMonthlyTrend(
  ordersByMonth: MonthlyOrderPoint[],
  range: AnalyticsDateRange
): MonthlyOrderPoint[] {
  if (range === 0) return ordersByMonth;
  return ordersByMonth.slice(-range);
}

export type KpiGrowth = {
  totalOrders: number | null;
  revenue: number | null;
  averageOrderValue: number | null;
  deliveredOrders: number | null;
  cancelledOrders: number | null;
};

function monthWindow(offset: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function ordersBetween(orders: Order[], start: Date, end: Date) {
  return orders.filter((o) => {
    const created = new Date(o.created_at);
    return created >= start && created <= end;
  });
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Month-over-month growth using calendar months from existing order dates. */
export function computeKpiGrowth(orders: Order[]): KpiGrowth {
  const current = monthWindow(0);
  const previous = monthWindow(1);
  const currentOrders = ordersBetween(orders, current.start, current.end);
  const previousOrders = ordersBetween(orders, previous.start, previous.end);

  if (currentOrders.length === 0 && previousOrders.length === 0) {
    return {
      totalOrders: null,
      revenue: null,
      averageOrderValue: null,
      deliveredOrders: null,
      cancelledOrders: null
    };
  }

  const cur = computeOrderAnalytics(currentOrders).summary;
  const prev = computeOrderAnalytics(previousOrders).summary;

  return {
    totalOrders: pctChange(cur.totalOrders, prev.totalOrders),
    revenue: pctChange(cur.revenue, prev.revenue),
    averageOrderValue: pctChange(Math.round(cur.averageOrderValue), Math.round(prev.averageOrderValue)),
    deliveredOrders: pctChange(cur.deliveredOrders, prev.deliveredOrders),
    cancelledOrders: pctChange(cur.cancelledOrders, prev.cancelledOrders)
  };
}

export function computeOrderAnalytics(orders: Order[]) {
  const summary: OrderAnalyticsSummary = {
    totalOrders: orders.length,
    revenue: 0,
    averageOrderValue: 0,
    pendingOrders: 0,
    processingOrders: 0,
    outForDeliveryOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0
  };

  const byMonth = new Map<string, { orders: number; revenue: number }>();
  const byStatus = new Map<string, number>();

  for (const order of orders) {
    byStatus.set(order.status, (byStatus.get(order.status) ?? 0) + 1);

    if (order.status === "pending") summary.pendingOrders++;
    if (order.status === "processing") summary.processingOrders++;
    const raw = order.status as string;
    if (raw === "shipped" || order.status === "out_for_delivery") summary.outForDeliveryOrders++;
    if (order.status === "delivered") summary.deliveredOrders++;
    if (order.status === "cancelled") summary.cancelledOrders++;

    const key = monthKey(order.created_at);
    const monthEntry = byMonth.get(key) ?? { orders: 0, revenue: 0 };
    monthEntry.orders += 1;
    byMonth.set(key, monthEntry);

    if (!REVENUE_EXCLUDED.has(order.status)) {
      const total = Number(order.total) || 0;
      summary.revenue += total;
      monthEntry.revenue += total;
      byMonth.set(key, monthEntry);
    }
  }

  const revenueOrders = orders.filter((o) => !REVENUE_EXCLUDED.has(o.status)).length;
  summary.averageOrderValue = revenueOrders > 0 ? summary.revenue / revenueOrders : 0;

  const ordersByMonth: MonthlyOrderPoint[] = Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      label: monthLabel(month),
      orders: data.orders,
      revenue: data.revenue
    }));

  const statusDistribution: StatusDistributionPoint[] = Array.from(byStatus.entries())
    .map(([status, count]) => ({
      status,
      label: orderStatusLabel(status),
      count
    }))
    .sort((a, b) => b.count - a.count);

  return { summary, ordersByMonth, statusDistribution };
}

export function computeTopSellingProducts(orders: Order[], limit = 5): TopSellingProduct[] {
  const map = new Map<
    string,
    { name: string; image?: string; revenue: number; orderIds: Set<string> }
  >();

  for (const order of orders) {
    if (REVENUE_EXCLUDED.has(order.status)) continue;
    for (const item of normalizeOrderItems(order.items)) {
      const key = item.productId || item.name;
      const existing = map.get(key) ?? {
        name: item.name,
        image: item.image,
        revenue: 0,
        orderIds: new Set<string>()
      };
      existing.revenue += item.subtotal;
      existing.orderIds.add(order.id);
      if (!existing.image && item.image) existing.image = item.image;
      map.set(key, existing);
    }
  }

  return Array.from(map.entries())
    .map(([productId, data]) => ({
      productId,
      name: data.name,
      image: data.image,
      ordersCount: data.orderIds.size,
      revenue: data.revenue
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export function computeDeliveryInsights(orders: Order[]): DeliveryInsights {
  const insights: DeliveryInsights = {
    local: { orders: 0, revenue: 0 },
    outstation: { orders: 0, revenue: 0 }
  };

  for (const order of orders) {
    if (REVENUE_EXCLUDED.has(order.status)) continue;
    const total = Number(order.total) || 0;
    const addr = order.shipping_address ?? {};
    const bucket = isVijayawadaDelivery(addr) ? insights.local : insights.outstation;
    bucket.orders += 1;
    bucket.revenue += total;
  }

  return insights;
}
