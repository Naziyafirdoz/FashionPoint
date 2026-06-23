"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  CHART_HEIGHT,
  PanelCard,
  STATUS_COLORS
} from "@/components/admin/analytics/analytics-shared";
import { useStoreAnalyticsContext } from "@/components/admin/analytics/store-analytics-context";

export function OrderAnalyticsSection() {
  const { analytics } = useStoreAnalyticsContext();
  const ordersAnalytics = analytics.orderAnalytics;

  if (ordersAnalytics.pipeline.length === 0) return null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-bold text-primary">Order Analytics</h2>
        <p className="text-xs text-foreground/55">
          Pipeline, completion, and fulfillment flow for the selected period
        </p>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/50">
          Order Pipeline
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {ordersAnalytics.pipeline.map((row) => (
            <div
              key={row.key}
              className="rounded-xl border border-accent/20 bg-white p-3 shadow-card"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground/55">
                {row.label}
              </p>
              <p className="mt-1 text-xl font-bold tabular-nums text-primary">{row.count}</p>
            </div>
          ))}
        </div>
      </div>

      {ordersAnalytics.distribution.length > 0 ? (
        <PanelCard title="Order Status Distribution" subtitle="Share of orders by stage">
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <BarChart
              data={ordersAnalytics.distribution}
              layout="vertical"
              margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0d8e4" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} width={108} />
              <Tooltip
                formatter={(value: number, _name, item) => {
                  const row = item.payload as { count: number; percentage: number };
                  return [`${value}% (${row.count} orders)`, "Share"];
                }}
              />
              <Bar dataKey="percentage" radius={[0, 4, 4, 0]} maxBarSize={22}>
                {ordersAnalytics.distribution.map((entry) => (
                  <Cell key={entry.key} fill={STATUS_COLORS[entry.key] ?? "#7b0d2b"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </PanelCard>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {ordersAnalytics.completionRate.denominator > 0 ? (
          <div className="rounded-xl border border-accent/20 bg-white p-4 shadow-card">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Completion Rate
            </p>
            {ordersAnalytics.completionRate.percent !== null ? (
              <p className="mt-2 text-2xl font-bold text-primary">
                {ordersAnalytics.completionRate.percent}%
              </p>
            ) : null}
            <p className="mt-1 text-xs text-foreground/60">
              {ordersAnalytics.completionRate.numerator} delivered of{" "}
              {ordersAnalytics.completionRate.denominator} non-cancelled
            </p>
          </div>
        ) : null}

        {ordersAnalytics.cancellationRate.denominator > 0 ? (
          <div className="rounded-xl border border-accent/20 bg-white p-4 shadow-card">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Cancellation Rate
            </p>
            {ordersAnalytics.cancellationRate.percent !== null ? (
              <p className="mt-2 text-2xl font-bold text-primary">
                {ordersAnalytics.cancellationRate.percent}%
              </p>
            ) : null}
            <p className="mt-1 text-xs text-foreground/60">
              {ordersAnalytics.cancellationRate.numerator} cancelled of{" "}
              {ordersAnalytics.cancellationRate.denominator} total
            </p>
          </div>
        ) : null}
      </div>

      {ordersAnalytics.flowStages.length > 0 ? (
        <PanelCard title="Order Flow" subtitle="Processing → Confirmed → Packed → Ready → Shipped → Delivered">
          <div className="space-y-1">
            {ordersAnalytics.flowStages.map((stage, index) => (
              <div key={stage.key}>
                <div className="flex items-center justify-between rounded-lg border border-accent/10 bg-blush/15 px-3 py-2.5">
                  <span className="text-sm font-medium text-foreground">{stage.label}</span>
                  <span className="text-sm font-bold tabular-nums text-primary">{stage.count}</span>
                </div>
                {index < ordersAnalytics.flowStages.length - 1 ? (
                  <p className="py-0.5 text-center text-primary">↓</p>
                ) : null}
              </div>
            ))}
          </div>
        </PanelCard>
      ) : null}
    </div>
  );
}
