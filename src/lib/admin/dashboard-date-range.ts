import { resolveReportsDateRange } from "@/lib/admin/reports";
import type { ReportsCustomRange } from "@/lib/admin/reports-params";
import type {
  DashboardData,
  DashboardKpis,
  DashboardOrderLean,
  DashboardRecentOrder,
  DashboardRevenuePoint
} from "@/lib/admin/dashboard";

export type DashboardRangeKey =
  | "today"
  | "yesterday"
  | "7d"
  | "month"
  | "2months"
  | "custom";

export type DashboardDateRangeState = {
  range: DashboardRangeKey;
  from: string;
  to: string;
};

export const DASHBOARD_RANGE_OPTIONS: { value: DashboardRangeKey; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "Last 7 Days" },
  { value: "month", label: "This Month" },
  { value: "2months", label: "Last 2 Months" },
  { value: "custom", label: "Custom Range" }
];

export const DEFAULT_DASHBOARD_RANGE: DashboardRangeKey = "7d";

const REVENUE_EXCLUDED_STATUSES = new Set(["cancelled", "returned"]);

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isWithinRange(iso: string, start: Date, end: Date): boolean {
  const created = new Date(iso);
  return created >= start && created <= end;
}

export function resolveDashboardDateRange(
  filter: DashboardRangeKey,
  custom?: ReportsCustomRange
): { start: Date; end: Date } | null {
  if (filter === "2months") {
    const now = new Date();
    const start = startOfDay(now);
    start.setMonth(start.getMonth() - 2);
    return { start, end: endOfDay(now) };
  }

  if (filter === "custom") {
    return resolveReportsDateRange("custom", custom);
  }

  return resolveReportsDateRange(filter);
}

function orderCustomerKey(order: DashboardOrderLean): string {
  const email = order.guest_email?.trim().toLowerCase();
  if (email) return `email:${email}`;

  const name = order.shipping_address?.name?.trim().toLowerCase();
  if (name) return `name:${name}`;

  const line = order.shipping_address?.line?.trim().toLowerCase();
  if (line) return `line:${line}`;

  return `order:${order.id}`;
}

function customerName(order: DashboardOrderLean): string {
  const addr = order.shipping_address;
  return addr?.name ?? addr?.line ?? order.guest_email ?? "Guest";
}

function enumerateDayKeys(start: Date, end: Date): string[] {
  const keys: string[] = [];
  const cursor = startOfDay(start);
  const last = startOfDay(end);

  while (cursor <= last) {
    keys.push(dayKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return keys;
}

function buildRevenueTrendForRange(
  orders: DashboardOrderLean[],
  start: Date,
  end: Date
): DashboardRevenuePoint[] {
  const byDate = new Map<string, { revenue: number; orders: number }>();

  for (const key of enumerateDayKeys(start, end)) {
    byDate.set(key, { revenue: 0, orders: 0 });
  }

  for (const order of orders) {
    if (REVENUE_EXCLUDED_STATUSES.has(order.status)) continue;
    if (!isWithinRange(order.created_at, start, end)) continue;

    const key = dayKey(new Date(order.created_at));
    const entry = byDate.get(key);
    if (!entry) continue;

    entry.revenue += Number(order.total) || 0;
    entry.orders += 1;
  }

  return Array.from(byDate.entries()).map(([date, { revenue, orders: orderCount }]) => ({
    date,
    revenue,
    orders: orderCount
  }));
}

export function filterDashboardByDateRange(
  data: DashboardData,
  state: DashboardDateRangeState
): {
  kpis: DashboardKpis;
  revenueTrend: DashboardRevenuePoint[];
  recentOrders: DashboardRecentOrder[];
} {
  const range = resolveDashboardDateRange(state.range, { start: state.from, end: state.to });

  if (!range) {
    return {
      kpis: {
        totalRevenue: 0,
        totalOrders: 0,
        totalCustomers: 0,
        totalProducts: data.kpis.totalProducts,
        outOfStockProducts: data.kpis.outOfStockProducts,
        lowStockProducts: data.kpis.lowStockProducts,
        totalReviews: 0
      },
      revenueTrend: [],
      recentOrders: []
    };
  }

  const ordersInRange = data.ordersLean.filter((order) =>
    isWithinRange(order.created_at, range.start, range.end)
  );

  const revenueOrders = ordersInRange.filter((order) => !REVENUE_EXCLUDED_STATUSES.has(order.status));
  const customerKeys = new Set<string>();
  for (const order of ordersInRange) {
    customerKeys.add(orderCustomerKey(order));
  }

  const reviewCount = data.reviewTimestamps.filter((createdAt) =>
    isWithinRange(createdAt, range.start, range.end)
  ).length;

  const recentOrders = [...ordersInRange]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10)
    .map((order) => ({
      id: order.id,
      orderNumber: order.order_number,
      customer: customerName(order),
      amount: Number(order.total) || 0,
      status: order.status,
      date: order.created_at
    }));

  return {
    kpis: {
      totalRevenue: revenueOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0),
      totalOrders: ordersInRange.length,
      totalCustomers: customerKeys.size,
      totalProducts: data.kpis.totalProducts,
      outOfStockProducts: data.kpis.outOfStockProducts,
      lowStockProducts: data.kpis.lowStockProducts,
      totalReviews: reviewCount
    },
    revenueTrend: buildRevenueTrendForRange(ordersInRange, range.start, range.end),
    recentOrders
  };
}
