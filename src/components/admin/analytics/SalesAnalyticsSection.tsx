"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  CHART_HEIGHT,
  ComparisonMetricCard,
  HighlightDayCard,
  PanelCard,
  StatCard,
  formatCompactCurrency,
  formatCurrency,
  type TrendRange
} from "@/components/admin/analytics/analytics-shared";
import { useStoreAnalyticsContext } from "@/components/admin/analytics/store-analytics-context";

export function SalesAnalyticsSection() {
  const { analytics } = useStoreAnalyticsContext();
  const sales = analytics.salesAnalytics;
  const [trendRange, setTrendRange] = useState<TrendRange>("daily");

  const trendData = useMemo(() => {
    if (trendRange === "weekly") return analytics.weeklyTrend;
    if (trendRange === "monthly") return analytics.monthlyTrend;
    return analytics.dailyTrend;
  }, [analytics, trendRange]);

  const hasTrendData = trendData.length > 0;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-bold text-primary">Sales Analytics</h2>
        <p className="text-xs text-foreground/55">Historical sales metrics from order data</p>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/50">
          Revenue Trends
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ComparisonMetricCard
            label="Revenue Today"
            value={formatCurrency(sales.revenueTrends.today.current)}
            comparison={sales.revenueTrends.today}
            isCurrency
          />
          <ComparisonMetricCard
            label="Revenue Last 7 Days"
            value={formatCurrency(sales.revenueTrends.last7Days.current)}
            comparison={sales.revenueTrends.last7Days}
            isCurrency
          />
          <ComparisonMetricCard
            label="Revenue Last 30 Days"
            value={formatCurrency(sales.revenueTrends.last30Days.current)}
            comparison={sales.revenueTrends.last30Days}
            isCurrency
          />
          <ComparisonMetricCard
            label="Revenue This Year"
            value={formatCurrency(sales.revenueTrends.thisYear.current)}
            comparison={sales.revenueTrends.thisYear}
            isCurrency
          />
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/50">
          Order Trends
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ComparisonMetricCard
            label="Orders Today"
            value={String(sales.orderTrends.today.current)}
            comparison={sales.orderTrends.today}
          />
          <ComparisonMetricCard
            label="Orders Last 7 Days"
            value={String(sales.orderTrends.last7Days.current)}
            comparison={sales.orderTrends.last7Days}
          />
          <ComparisonMetricCard
            label="Orders Last 30 Days"
            value={String(sales.orderTrends.last30Days.current)}
            comparison={sales.orderTrends.last30Days}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/50">
            Products Sold
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard label="Today" value={String(sales.productsSoldTrends.today)} />
            <StatCard label="This Week" value={String(sales.productsSoldTrends.thisWeek)} />
            <StatCard label="This Month" value={String(sales.productsSoldTrends.thisMonth)} />
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/50">
            Average Order Value
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <ComparisonMetricCard
              label="AOV Today"
              value={formatCurrency(sales.aovTrends.today.current)}
              comparison={sales.aovTrends.today}
              isCurrency
            />
            <ComparisonMetricCard
              label="AOV Last 7 Days"
              value={formatCurrency(sales.aovTrends.last7Days.current)}
              comparison={sales.aovTrends.last7Days}
              isCurrency
            />
            <ComparisonMetricCard
              label="AOV Last 30 Days"
              value={formatCurrency(sales.aovTrends.last30Days.current)}
              comparison={sales.aovTrends.last30Days}
              isCurrency
            />
          </div>
        </div>
      </div>

      {(sales.bestSalesDay || sales.worstSalesDay) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {sales.bestSalesDay ? (
            <HighlightDayCard
              title="Best Sales Day"
              label={sales.bestSalesDay.label}
              revenue={sales.bestSalesDay.revenue}
              orders={sales.bestSalesDay.orders}
            />
          ) : null}
          {sales.worstSalesDay ? (
            <HighlightDayCard
              title="Worst Sales Day"
              label={sales.worstSalesDay.label}
              revenue={sales.worstSalesDay.revenue}
              orders={sales.worstSalesDay.orders}
            />
          ) : null}
        </div>
      )}

      {(sales.topRevenuePeriods.bestDay ||
        sales.topRevenuePeriods.bestWeek ||
        sales.topRevenuePeriods.bestMonth) && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/50">
            Top Revenue Period
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {sales.topRevenuePeriods.bestDay ? (
              <HighlightDayCard
                title="Best Day"
                label={sales.topRevenuePeriods.bestDay.label}
                revenue={sales.topRevenuePeriods.bestDay.revenue}
                orders={sales.topRevenuePeriods.bestDay.orders}
              />
            ) : null}
            {sales.topRevenuePeriods.bestWeek ? (
              <HighlightDayCard
                title="Best Week"
                label={sales.topRevenuePeriods.bestWeek.label}
                revenue={sales.topRevenuePeriods.bestWeek.revenue}
                orders={sales.topRevenuePeriods.bestWeek.orders}
              />
            ) : null}
            {sales.topRevenuePeriods.bestMonth ? (
              <HighlightDayCard
                title="Best Month"
                label={sales.topRevenuePeriods.bestMonth.label}
                revenue={sales.topRevenuePeriods.bestMonth.revenue}
                orders={sales.topRevenuePeriods.bestMonth.orders}
              />
            ) : null}
          </div>
        </div>
      )}

      {hasTrendData ? (
        <PanelCard
          title="Sales Trend"
          subtitle="Revenue over time"
          action={
            <select
              aria-label="Sales trend range"
              value={trendRange}
              onChange={(e) => setTrendRange(e.target.value as TrendRange)}
              className="h-8 rounded-lg border border-accent/30 bg-white px-2 text-xs text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          }
        >
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <AreaChart data={trendData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="storeSalesGradient" x1="0" y1="0" x2="0" y2="1">
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
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0]?.payload as { revenue: number; orders: number };
                  return (
                    <div className="rounded-lg border bg-white px-3 py-2 text-xs shadow-md">
                      <p className="font-semibold text-primary">{label}</p>
                      <p className="mt-1 text-foreground/70">
                        Revenue: {formatCurrency(point.revenue)}
                      </p>
                      <p className="text-foreground/70">Orders: {point.orders}</p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#7b0d2b"
                strokeWidth={2}
                fill="url(#storeSalesGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </PanelCard>
      ) : null}
    </div>
  );
}

export function SalesTrendChart({ gradientId = "storeSalesGradient" }: { gradientId?: string }) {
  const { analytics } = useStoreAnalyticsContext();
  const [trendRange, setTrendRange] = useState<TrendRange>("daily");

  const trendData = useMemo(() => {
    if (trendRange === "weekly") return analytics.weeklyTrend;
    if (trendRange === "monthly") return analytics.monthlyTrend;
    return analytics.dailyTrend;
  }, [analytics, trendRange]);

  if (trendData.length === 0) return null;

  return (
    <PanelCard
      title="Sales Trend"
      subtitle="Revenue over time"
      action={
        <select
          aria-label="Sales trend range"
          value={trendRange}
          onChange={(e) => setTrendRange(e.target.value as TrendRange)}
          className="h-8 rounded-lg border border-accent/30 bg-white px-2 text-xs text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      }
    >
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <AreaChart data={trendData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
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
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0]?.payload as { revenue: number; orders: number };
              return (
                <div className="rounded-lg border bg-white px-3 py-2 text-xs shadow-md">
                  <p className="font-semibold text-primary">{label}</p>
                  <p className="mt-1 text-foreground/70">Revenue: {formatCurrency(point.revenue)}</p>
                  <p className="text-foreground/70">Orders: {point.orders}</p>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#7b0d2b"
            strokeWidth={2}
            fill={`url(#${gradientId})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </PanelCard>
  );
}
