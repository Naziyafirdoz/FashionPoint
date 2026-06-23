"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { Package, type LucideIcon } from "lucide-react";
import {
  STORE_ANALYTICS_FILTERS,
  type ProductAnalyticsRow,
  type PeriodComparison,
  type StoreAnalyticsFilter
} from "@/lib/admin/store-analytics";

export const CHART_HEIGHT = 240;

export const STATUS_COLORS: Record<string, string> = {
  processing: "#f97316",
  confirmed: "#10b981",
  packed: "#6366f1",
  ready_to_ship: "#8b5cf6",
  shipped: "#3b82f6",
  delivered: "#22c55e",
  cancelled: "#ef4444"
};

export const CATEGORY_COLORS = [
  "#7b0d2b",
  "#c9a227",
  "#6366f1",
  "#10b981",
  "#f97316",
  "#3b82f6",
  "#8b5cf6",
  "#ef4444"
];

export type TrendRange = "daily" | "weekly" | "monthly";

export function formatCurrency(value: number) {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

export function formatCompactCurrency(value: number) {
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}k`;
  return `₹${value}`;
}

export function formatDuration(hours: number) {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 24) return `${hours.toFixed(1)} hrs`;
  return `${(hours / 24).toFixed(1)} days`;
}

export function KpiCard({
  icon: Icon,
  label,
  value
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex h-full min-h-[7.5rem] flex-col rounded-xl border border-accent/20 bg-white p-4 shadow-card">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-primary">{value}</p>
    </div>
  );
}

export function PanelCard({
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

function ComparisonBadge({ percent }: { percent: number | null }) {
  if (percent === null) return null;
  const positive = percent >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${
        positive ? "text-emerald-700" : "text-red-700"
      }`}
    >
      {positive ? "▲" : "▼"} {Math.abs(percent)}%
    </span>
  );
}

export function ComparisonMetricCard({
  label,
  value,
  comparison,
  isCurrency = false
}: {
  label: string;
  value: string;
  comparison: PeriodComparison;
  isCurrency?: boolean;
}) {
  const showPrevious = comparison.previous !== null && comparison.changePercent !== null;

  return (
    <div className="rounded-xl border border-accent/20 bg-white p-4 shadow-card">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-xl font-bold tabular-nums text-primary">{value}</p>
      {showPrevious ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-foreground/55">
          <ComparisonBadge percent={comparison.changePercent} />
          <span>
            vs{" "}
            {isCurrency
              ? formatCurrency(comparison.previous!)
              : String(comparison.previous)}
          </span>
        </div>
      ) : null}
    </div>
  );
}

export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-accent/20 bg-white p-4 shadow-card">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-xl font-bold tabular-nums text-primary">{value}</p>
    </div>
  );
}

export function HighlightDayCard({
  title,
  label,
  revenue,
  orders
}: {
  title: string;
  label: string;
  revenue: number;
  orders: number;
}) {
  return (
    <div className="rounded-xl border border-accent/20 bg-white p-4 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">{title}</p>
      <p className="mt-2 text-lg font-bold text-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-primary">{formatCurrency(revenue)}</p>
      <p className="mt-1 text-sm text-foreground/60">
        {orders} {orders === 1 ? "order" : "orders"}
      </p>
    </div>
  );
}

export function DateFilterSelect({
  value,
  onChange
}: {
  value: StoreAnalyticsFilter;
  onChange: (value: StoreAnalyticsFilter) => void;
}) {
  return (
    <select
      aria-label="Date range"
      value={value}
      onChange={(e) => onChange(e.target.value as StoreAnalyticsFilter)}
      className="h-9 rounded-lg border border-accent/30 bg-white px-3 text-sm text-primary shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
    >
      {STORE_ANALYTICS_FILTERS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export function ProductThumb({ image, name }: { image?: string; name: string }) {
  return (
    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-white">
      {image ? (
        <Image src={image} alt="" fill className="object-cover" sizes="40px" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-foreground/30">
          <Package className="h-4 w-4" aria-hidden />
        </span>
      )}
    </div>
  );
}

export function ProductListRow({
  product,
  index,
  detail
}: {
  product: ProductAnalyticsRow;
  index?: number;
  detail: ReactNode;
}) {
  return (
    <li className="flex items-center gap-2.5 rounded-lg border border-accent/10 bg-blush/15 px-2 py-2">
      {typeof index === "number" ? (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[9px] font-bold text-foreground">
          {index + 1}
        </span>
      ) : null}
      <ProductThumb image={product.image} name={product.name} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{product.name}</p>
        <p className="text-[11px] text-foreground/55">{detail}</p>
      </div>
    </li>
  );
}
