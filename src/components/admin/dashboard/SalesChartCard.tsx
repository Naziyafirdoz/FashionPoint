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
import { BarChart3 } from "lucide-react";
import type { DashboardPeriod, DashboardRevenuePoint } from "@/lib/admin/dashboard";
import { EmptyState } from "./EmptyState";

const PERIODS: { value: DashboardPeriod; label: string }[] = [
  { value: "7", label: "7 Days" },
  { value: "30", label: "30 Days" },
  { value: "90", label: "90 Days" }
];

function formatAxisDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function formatCurrency(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

export function SalesChartCard({
  revenueTrend
}: {
  revenueTrend: Record<DashboardPeriod, DashboardRevenuePoint[]>;
}) {
  const [period, setPeriod] = useState<DashboardPeriod>("30");
  const data = revenueTrend[period];

  const hasRevenue = useMemo(() => data.some((d) => d.revenue > 0), [data]);

  return (
    <div className="rounded-2xl border border-accent/20 bg-white p-6 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-primary">Sales Overview</h2>
          <p className="text-xs text-foreground/50">Revenue trend from completed orders</p>
        </div>
        <div className="flex rounded-full border bg-blush/30 p-1">
          {PERIODS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setPeriod(value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                period === value
                  ? "bg-white text-primary shadow-sm"
                  : "text-foreground/60 hover:text-primary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 h-72">
        {!hasRevenue ? (
          <EmptyState
            icon={BarChart3}
            title="No sales data yet"
            description="Revenue will appear here once orders are placed."
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7b0d2b" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#7b0d2b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0d8e4" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatAxisDate}
                tick={{ fontSize: 11, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={(v) => (v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`)}
                tick={{ fontSize: 11, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #f0d8e4",
                  fontSize: 12
                }}
                formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                labelFormatter={(label) =>
                  new Date(label).toLocaleDateString("en-IN", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric"
                  })
                }
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#7b0d2b"
                strokeWidth={2}
                fill="url(#revenueGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
