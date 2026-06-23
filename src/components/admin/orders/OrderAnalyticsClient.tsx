"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  BarChart3,
  CircleDollarSign,
  MapPin,
  Package,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Truck,
  XCircle,
  type LucideIcon
} from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminLiveStatus } from "@/components/admin/AdminLiveStatus";
import { EmptyState } from "@/components/admin/dashboard/EmptyState";
import { useAdminNotifications } from "@/contexts/AdminNotificationsProvider";
import type { OrderRealtimeEvent } from "@/lib/admin/notifications/types";
import { useLiveTimestamp } from "@/lib/admin/use-live-timestamp";
import { applyPaymentRulesToOrder } from "@/lib/orders/payment-rules";
import {
  computeDeliveryInsights,
  computeKpiGrowth,
  computeOrderAnalytics,
  computeTopSellingProducts,
  filterOrdersByDateRange,
  sliceMonthlyTrend,
  type AnalyticsDateRange
} from "@/lib/orders/analytics";
import type { Order } from "@/types";

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  processing: "#f97316",
  confirmed: "#10b981",
  packing_assigned: "#3b82f6",
  packed: "#6366f1",
  ready_to_ship: "#8b5cf6",
  shipped: "#3b82f6",
  out_for_delivery: "#2563eb",
  delivered: "#22c55e",
  cancelled: "#ef4444",
  cancel_requested: "#fb923c",
  returned: "#f97316"
};

const DATE_RANGES: { value: AnalyticsDateRange; label: string }[] = [
  { value: 3, label: "Last 3 Months" },
  { value: 6, label: "Last 6 Months" },
  { value: 12, label: "Last 12 Months" },
  { value: 0, label: "All Time" }
];

const CHART_HEIGHT = 220;

function formatCurrency(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

function formatCompactCurrency(value: number) {
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}k`;
  return `₹${value}`;
}

async function fetchOrdersForAnalytics(): Promise<Order[]> {
  const limit = 100;
  let page = 1;
  let all: Order[] = [];
  let total = Infinity;

  while (all.length < total) {
    const res = await fetch(`/api/orders?tab=all&limit=${limit}&page=${page}`, {
      cache: "no-store"
    });
    if (!res.ok) break;
    const data = await res.json();
    const batch = (data.orders ?? []) as Order[];
    all = all.concat(batch);
    total = typeof data.total === "number" ? data.total : batch.length;
    if (batch.length < limit) break;
    page += 1;
  }

  return all;
}

function patchAnalyticsOrders(prev: Order[], { event, order }: OrderRealtimeEvent): Order[] {
  const nextOrder = applyPaymentRulesToOrder(order);

  if (event === "INSERT") {
    if (prev.some((row) => row.id === nextOrder.id)) return prev;
    return [nextOrder, ...prev];
  }

  const idx = prev.findIndex((row) => row.id === nextOrder.id);
  if (idx < 0) {
    return [nextOrder, ...prev];
  }

  const current = prev[idx];
  if (current.status === nextOrder.status && current.updated_at === nextOrder.updated_at) {
    return prev;
  }

  const next = [...prev];
  next[idx] = nextOrder;
  return next;
}

function GrowthBadge({ value, invert = false }: { value: number | null; invert?: boolean }) {
  if (value === null) return null;
  const positive = invert ? value <= 0 : value >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        positive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
      }`}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {positive ? "+" : ""}
      {value}% vs last month
    </span>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  growth,
  invertGrowth = false
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  growth: number | null;
  invertGrowth?: boolean;
}) {
  return (
    <div className="flex h-full min-h-[7.5rem] flex-col rounded-xl border border-accent/20 bg-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <GrowthBadge value={growth} invert={invertGrowth} />
      </div>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-primary">{value}</p>
    </div>
  );
}

function PanelCard({
  title,
  subtitle,
  action,
  children,
  className = ""
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex h-full min-h-[17rem] flex-col rounded-xl border border-accent/20 bg-white p-4 shadow-card ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-primary">{title}</h2>
          {subtitle ? <p className="text-xs text-foreground/50">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-3 min-h-0 flex-1">{children}</div>
    </div>
  );
}

function DateRangeSelect({
  value,
  onChange
}: {
  value: AnalyticsDateRange;
  onChange: (v: AnalyticsDateRange) => void;
}) {
  return (
    <select
      aria-label="Date range"
      value={value}
      onChange={(e) => onChange(Number(e.target.value) as AnalyticsDateRange)}
      className="h-9 rounded-lg border border-accent/30 bg-white px-3 text-sm text-primary shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
    >
      {DATE_RANGES.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export function OrderAnalyticsClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<AnalyticsDateRange>(6);
  const { subscribeToOrderChanges } = useAdminNotifications();
  const { lastUpdated, touch } = useLiveTimestamp();

  const loadOrders = useCallback(async () => {
    const data = await fetchOrdersForAnalytics();
    setOrders(data);
    touch();
  }, [touch]);

  useEffect(() => {
    void loadOrders().finally(() => setLoading(false));
  }, [loadOrders]);

  useEffect(() => {
    return subscribeToOrderChanges((payload) => {
      setOrders((prev) => patchAnalyticsOrders(prev, payload));
      touch();
    });
  }, [subscribeToOrderChanges, touch]);

  const normalizedOrders = useMemo(
    () => orders.map((o) => applyPaymentRulesToOrder(o)),
    [orders]
  );

  const filteredOrders = useMemo(
    () => filterOrdersByDateRange(normalizedOrders, dateRange),
    [normalizedOrders, dateRange]
  );

  const { summary, ordersByMonth, statusDistribution } = useMemo(
    () => computeOrderAnalytics(filteredOrders),
    [filteredOrders]
  );

  const monthlyTrend = useMemo(() => {
    if (dateRange === 0) return sliceMonthlyTrend(ordersByMonth, 6);
    return ordersByMonth;
  }, [ordersByMonth, dateRange]);

  const growth = useMemo(() => computeKpiGrowth(normalizedOrders), [normalizedOrders]);

  const topProducts = useMemo(
    () => computeTopSellingProducts(filteredOrders, 5),
    [filteredOrders]
  );

  const deliveryInsights = useMemo(
    () => computeDeliveryInsights(filteredOrders),
    [filteredOrders]
  );

  const deliveryTotal =
    deliveryInsights.local.orders + deliveryInsights.outstation.orders || 1;

  const statusTotal = useMemo(
    () => statusDistribution.reduce((sum, s) => sum + s.count, 0),
    [statusDistribution]
  );

  const hasData = orders.length > 0;

  return (
    <>
      <AdminHeader
        title="Order Analytics"
        action={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <AdminLiveStatus lastUpdated={lastUpdated} live />
            <DateRangeSelect value={dateRange} onChange={setDateRange} />
          </div>
        }
      />

      <div className="border-b bg-blush/20 px-4 py-2.5 sm:px-6">
        <Link href="/admin/orders" className="text-sm font-medium text-primary hover:underline">
          ← Back to orders
        </Link>
      </div>

      <div className="space-y-4 bg-blush/30 p-4 sm:p-6">
        {loading ? (
          <p className="text-sm text-foreground/60">Loading analytics…</p>
        ) : !hasData ? (
          <EmptyState
            icon={BarChart3}
            title="No order data yet"
            description="Analytics will appear once orders are placed."
          />
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="No orders in this period"
            description="Try a wider date range to see analytics."
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <KpiCard
                icon={ShoppingBag}
                label="Total Orders"
                value={String(summary.totalOrders)}
                growth={growth.totalOrders}
              />
              <KpiCard
                icon={CircleDollarSign}
                label="Revenue"
                value={formatCurrency(summary.revenue)}
                growth={growth.revenue}
              />
              <KpiCard
                icon={TrendingUp}
                label="Average Order Value"
                value={formatCurrency(Math.round(summary.averageOrderValue))}
                growth={growth.averageOrderValue}
              />
              <KpiCard
                icon={Truck}
                label="Delivered Orders"
                value={String(summary.deliveredOrders)}
                growth={growth.deliveredOrders}
              />
              <KpiCard
                icon={XCircle}
                label="Cancelled Orders"
                value={String(summary.cancelledOrders)}
                growth={growth.cancelledOrders}
                invertGrowth
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <PanelCard
                title="Revenue Trend"
                subtitle="Monthly revenue (excl. cancelled)"
                action={
                  <span className="rounded-full border border-accent/20 bg-blush/40 px-2.5 py-1 text-[10px] font-medium text-primary">
                    {DATE_RANGES.find((r) => r.value === dateRange)?.label ?? "Last 6 Months"}
                  </span>
                }
              >
                {monthlyTrend.length === 0 ? (
                  <p className="text-sm text-foreground/50">No monthly revenue data.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                    <AreaChart data={monthlyTrend} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="analyticsRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7b0d2b" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#7b0d2b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0d8e4" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        width={48}
                        tickFormatter={(v) => formatCompactCurrency(Number(v))}
                      />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#7b0d2b"
                        strokeWidth={2}
                        fill="url(#analyticsRevenueGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </PanelCard>

              <PanelCard
                title="Orders Trend"
                subtitle="Monthly order count"
                action={
                  <span className="rounded-full border border-accent/20 bg-blush/40 px-2.5 py-1 text-[10px] font-medium text-primary">
                    {DATE_RANGES.find((r) => r.value === dateRange)?.label ?? "Last 6 Months"}
                  </span>
                }
              >
                {monthlyTrend.length === 0 ? (
                  <p className="text-sm text-foreground/50">No monthly order data.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                    <BarChart data={monthlyTrend} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0d8e4" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 10 }} width={32} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="orders" fill="#7b0d2b" radius={[4, 4, 0, 0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </PanelCard>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <PanelCard title="Status Distribution" subtitle="Orders by current status">
                {statusDistribution.length === 0 ? (
                  <p className="text-sm text-foreground/50">No status data.</p>
                ) : (
                  <div className="flex h-full flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative mx-auto h-[9.5rem] w-full max-w-[9.5rem] shrink-0 sm:mx-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusDistribution}
                            dataKey="count"
                            nameKey="label"
                            cx="50%"
                            cy="50%"
                            innerRadius={38}
                            outerRadius={58}
                            paddingAngle={2}
                          >
                            {statusDistribution.map((entry) => (
                              <Cell
                                key={entry.status}
                                fill={STATUS_COLORS[entry.status] ?? "#9ca3af"}
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-xl font-bold tabular-nums text-primary">{statusTotal}</p>
                          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                            Orders
                          </p>
                        </div>
                      </div>
                    </div>
                    <ul className="min-w-0 flex-1 space-y-1.5">
                      {statusDistribution.slice(0, 6).map((entry) => (
                        <li
                          key={entry.status}
                          className="flex items-center justify-between gap-2 text-xs text-gray-600"
                        >
                          <span className="flex min-w-0 items-center gap-1.5">
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{
                                backgroundColor: STATUS_COLORS[entry.status] ?? "#9ca3af"
                              }}
                            />
                            <span className="truncate">{entry.label}</span>
                          </span>
                          <span className="font-semibold tabular-nums text-primary">{entry.count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </PanelCard>

              <PanelCard title="Delivery Insights" subtitle="Based on shipping address">
                <div className="flex h-full flex-col justify-center gap-3">
                  {[
                    {
                      label: "Local Orders (Vijayawada)",
                      data: deliveryInsights.local,
                      bar: "bg-primary"
                    },
                    {
                      label: "Outstation Orders",
                      data: deliveryInsights.outstation,
                      bar: "bg-accent"
                    }
                  ].map(({ label, data, bar }) => {
                    const pct = Math.round((data.orders / deliveryTotal) * 100);
                    return (
                      <div
                        key={label}
                        className="rounded-lg border border-accent/15 bg-blush/20 px-3 py-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                            <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden />
                            {label}
                          </span>
                          <span className="text-xs font-bold text-primary">{pct}%</span>
                        </div>
                        <p className="mt-1 text-[11px] text-foreground/60">
                          {data.orders} orders · {formatCurrency(data.revenue)}
                        </p>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/80">
                          <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </PanelCard>

              <PanelCard title="Top Selling Products" subtitle="Top 5 by revenue">
                {topProducts.length === 0 ? (
                  <p className="text-sm text-foreground/50">No product sales yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {topProducts.map((product, index) => (
                      <li
                        key={product.productId}
                        className="flex items-center gap-2.5 rounded-lg border border-accent/10 bg-blush/15 px-2 py-2"
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">
                          {index + 1}
                        </span>
                        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md border bg-white">
                          {product.image ? (
                            <Image
                              src={product.image}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="36px"
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-foreground/30">
                              <Package className="h-3.5 w-3.5" aria-hidden />
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-foreground">
                            {product.name}
                          </p>
                          <p className="text-[10px] text-foreground/55">
                            {product.ordersCount} orders · {formatCurrency(product.revenue)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </PanelCard>
            </div>
          </>
        )}
      </div>
    </>
  );
}
