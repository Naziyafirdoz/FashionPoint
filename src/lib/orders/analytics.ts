import type { Order, OrderStatus } from "@/types";

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
  count: number;
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
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  return { summary, ordersByMonth, statusDistribution };
}
