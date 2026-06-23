"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { CalendarDays, CircleDollarSign, ShoppingBag, TrendingUp } from "lucide-react";
import { AIGrowthPageShell } from "@/components/admin/ai-growth/AIGrowthPageShell";
import {
  AIGrowthEmptyState,
  AIGrowthInsightRow,
  AIGrowthSectionHeader
} from "@/components/admin/ai-growth/ai-growth-shared";
import { useAIGrowthContext } from "@/components/admin/ai-growth/ai-growth-context";
import {
  CHART_HEIGHT,
  KpiCard,
  PanelCard,
  formatCompactCurrency,
  formatCurrency
} from "@/components/admin/analytics/analytics-shared";
import { computeRevenueIntelligence } from "@/lib/ai-growth/revenue-intelligence";

function formatGrowthPercent(value: number | null): string {
  if (value === null) return "—";
  if (value > 0) return `+${value}%`;
  return `${value}%`;
}

export function RevenueIntelligenceClient() {
  const { orders, dateFilter } = useAIGrowthContext();

  const intelligence = useMemo(
    () => computeRevenueIntelligence(orders, dateFilter),
    [orders, dateFilter]
  );

  return (
    <AIGrowthPageShell title="Revenue Intelligence">
      {!intelligence.hasCurrentPeriodData ? (
        <AIGrowthEmptyState icon={CircleDollarSign} />
      ) : (
        <div className="space-y-4">
          <AIGrowthSectionHeader
            title="Revenue Intelligence"
            subtitle="Revenue, orders, and AOV from order data in the selected period"
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              icon={TrendingUp}
              label="Revenue Growth"
              value={formatGrowthPercent(intelligence.revenueGrowthPercent)}
            />
            <KpiCard
              icon={ShoppingBag}
              label="Orders Growth"
              value={formatGrowthPercent(intelligence.ordersGrowthPercent)}
            />
            <KpiCard
              icon={CircleDollarSign}
              label="AOV Growth"
              value={formatGrowthPercent(intelligence.aovGrowthPercent)}
            />
            <KpiCard
              icon={CalendarDays}
              label="Highest Revenue Day"
              value={
                intelligence.highestRevenueDay
                  ? formatCurrency(intelligence.highestRevenueDay.revenue)
                  : "—"
              }
            />
          </div>

          {intelligence.revenueTrend.length > 0 ? (
            <PanelCard title="Revenue Trend" subtitle="Daily revenue in the selected period">
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <LineChart
                  data={intelligence.revenueTrend}
                  margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0d8e4" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    width={48}
                    tickFormatter={(value) => formatCompactCurrency(Number(value))}
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
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#7b0d2b"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </PanelCard>
          ) : null}

          <PanelCard
            title="Previous vs Current Period"
            subtitle="Revenue, orders, and average order value"
          >
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <BarChart
                data={intelligence.periodComparison}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0d8e4" vertical={false} />
                <XAxis dataKey="metric" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={48} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0]?.payload as {
                      metric: string;
                      current: number;
                      previous: number;
                    };
                    const isCurrency = row.metric === "Revenue" || row.metric === "AOV";
                    const formatValue = (value: number) =>
                      isCurrency ? formatCurrency(value) : String(value);

                    return (
                      <div className="rounded-lg border bg-white px-3 py-2 text-xs shadow-md">
                        <p className="font-semibold text-primary">{label}</p>
                        <p className="mt-1 text-foreground/70">
                          Previous: {formatValue(row.previous)}
                        </p>
                        <p className="text-foreground/70">Current: {formatValue(row.current)}</p>
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="previous" name="Previous" fill="#c9a227" radius={[4, 4, 0, 0]} maxBarSize={36} />
                <Bar dataKey="current" name="Current" fill="#7b0d2b" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </PanelCard>

          {intelligence.bestRevenueDays.length > 0 ? (
            <PanelCard title="Best Revenue Days" subtitle="Top 10 days by revenue">
              <ul className="space-y-2">
                {intelligence.bestRevenueDays.map((day, index) => (
                  <li
                    key={day.key}
                    className="flex items-center gap-2.5 rounded-lg border border-accent/10 bg-blush/15 px-2 py-2"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[9px] font-bold text-foreground">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{day.label}</p>
                      <p className="text-[11px] text-foreground/55">
                        {day.orders} {day.orders === 1 ? "order" : "orders"}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-bold tabular-nums text-primary">
                      {formatCurrency(day.revenue)}
                    </p>
                  </li>
                ))}
              </ul>
            </PanelCard>
          ) : null}

          {intelligence.revenueInsights.length > 0 ? (
            <PanelCard title="Revenue Insights" subtitle="Selected period">
              <ul className="space-y-2">
                {intelligence.revenueInsights.map((insight) => (
                  <AIGrowthInsightRow key={insight.id} tone={insight.tone} text={insight.text} />
                ))}
              </ul>
            </PanelCard>
          ) : null}
        </div>
      )}
    </AIGrowthPageShell>
  );
}
