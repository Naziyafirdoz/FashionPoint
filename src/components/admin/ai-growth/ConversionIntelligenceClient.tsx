"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Ban, CheckCircle2, ShoppingBag, XCircle } from "lucide-react";
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
  STATUS_COLORS,
  formatCurrency
} from "@/components/admin/analytics/analytics-shared";
import { computeConversionIntelligence } from "@/lib/ai-growth/conversion-intelligence";

const PAYMENT_COLORS: Record<string, string> = {
  paid: "#22c55e",
  pending: "#f97316",
  failed: "#ef4444",
  refunded: "#64748b"
};

export function ConversionIntelligenceClient() {
  const { orders, dateFilter } = useAIGrowthContext();

  const intelligence = useMemo(
    () => computeConversionIntelligence(orders, dateFilter),
    [orders, dateFilter]
  );

  return (
    <AIGrowthPageShell title="Conversion Intelligence">
      {!intelligence.hasPeriodOrders ? (
        <AIGrowthEmptyState icon={ShoppingBag} />
      ) : (
        <div className="space-y-4">
          <AIGrowthSectionHeader
            title="Conversion Intelligence"
            subtitle="Order, payment, and fulfillment counts from order data in the selected period"
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard icon={ShoppingBag} label="Orders" value={String(intelligence.totalOrders)} />
            <KpiCard icon={CheckCircle2} label="Paid Orders" value={String(intelligence.paidOrders)} />
            <KpiCard icon={XCircle} label="Cancelled Orders" value={String(intelligence.cancelledOrders)} />
            <KpiCard
              icon={Ban}
              label="Order Success Rate"
              value={
                intelligence.orderSuccessRate === null ? "—" : `${intelligence.orderSuccessRate}%`
              }
            />
          </div>

          {intelligence.conversionInsights.length > 0 ? (
            <PanelCard title="Conversion Insights" subtitle="Selected period">
              <ul className="space-y-2">
                {intelligence.conversionInsights.map((insight) => (
                  <AIGrowthInsightRow key={insight.id} tone={insight.tone} text={insight.text} />
                ))}
              </ul>
            </PanelCard>
          ) : null}

          {intelligence.orderStatusDistribution.length > 0 ? (
            <PanelCard title="Order Status Distribution" subtitle="Orders by status">
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <BarChart
                  data={intelligence.orderStatusDistribution}
                  layout="vertical"
                  margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0d8e4" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} width={120} />
                  <Tooltip formatter={(value: number) => [value, "Orders"]} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={24}>
                    {intelligence.orderStatusDistribution.map((entry) => (
                      <Cell
                        key={entry.key}
                        fill={STATUS_COLORS[entry.key] ?? (entry.key === "returned" ? "#94a3b8" : "#7b0d2b")}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </PanelCard>
          ) : null}

          {intelligence.paymentStatusDistribution.length > 0 ? (
            <PanelCard title="Payment Status Distribution" subtitle="Orders by payment status">
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <BarChart
                  data={intelligence.paymentStatusDistribution}
                  margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0d8e4" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={40} allowDecimals={false} />
                  <Tooltip formatter={(value: number) => [value, "Orders"]} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {intelligence.paymentStatusDistribution.map((entry) => (
                      <Cell key={entry.key} fill={PAYMENT_COLORS[entry.key] ?? "#7b0d2b"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </PanelCard>
          ) : null}

          {intelligence.dailyOrderTrend.length > 0 ? (
            <PanelCard title="Daily Order Trend" subtitle="Orders per day in the selected period">
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <LineChart
                  data={intelligence.dailyOrderTrend}
                  margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0d8e4" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} width={40} allowDecimals={false} />
                  <Tooltip formatter={(value: number) => [value, "Orders"]} />
                  <Line
                    type="monotone"
                    dataKey="orders"
                    stroke="#7b0d2b"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </PanelCard>
          ) : null}

          {intelligence.cancellationCount > 0 && intelligence.cancellationPercent !== null ? (
            <PanelCard title="Cancellation Analysis" subtitle="Cancelled and returned orders">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-accent/10 bg-blush/15 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/50">
                    Cancelled Orders
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-primary">
                    {intelligence.cancellationCount}
                  </p>
                </div>
                <div className="rounded-lg border border-accent/10 bg-blush/15 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/50">
                    Cancellation Percentage
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-primary">
                    {intelligence.cancellationPercent}%
                  </p>
                </div>
              </div>
            </PanelCard>
          ) : null}

          {intelligence.fulfillmentPipeline.length > 0 ? (
            <PanelCard title="Fulfillment Pipeline" subtitle="Orders by fulfillment stage">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {intelligence.fulfillmentPipeline.map((stage) => (
                  <div
                    key={stage.key}
                    className="rounded-xl border border-accent/20 bg-white p-3 shadow-card"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground/55">
                      {stage.label}
                    </p>
                    <p className="mt-1 text-xl font-bold tabular-nums text-primary">{stage.count}</p>
                  </div>
                ))}
              </div>
            </PanelCard>
          ) : null}

          {intelligence.topOrderDays.length > 0 ? (
            <PanelCard title="Top Order Days" subtitle="Top 10 days by order count">
              <ul className="space-y-2">
                {intelligence.topOrderDays.map((day, index) => (
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
        </div>
      )}
    </AIGrowthPageShell>
  );
}
