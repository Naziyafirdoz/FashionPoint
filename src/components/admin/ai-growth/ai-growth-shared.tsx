"use client";

import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, CircleAlert, Info, Sparkles, type LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/admin/dashboard/EmptyState";

export type AIGrowthDateFilter = "today" | "7d" | "30d" | "90d" | "year";

export const AI_GROWTH_EMPTY_MESSAGE =
  "Not enough order history to calculate this metric.";

export type AIGrowthInsightTone = "success" | "warning" | "info" | "critical";

const INSIGHT_TONE_STYLES: Record<
  AIGrowthInsightTone,
  { icon: LucideIcon; iconClass: string; rowClass: string }
> = {
  success: {
    icon: CheckCircle2,
    iconClass: "text-emerald-600",
    rowClass: "border-emerald-100 bg-emerald-50/60"
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-amber-600",
    rowClass: "border-amber-100 bg-amber-50/60"
  },
  info: {
    icon: Info,
    iconClass: "text-primary",
    rowClass: "border-accent/10 bg-blush/15"
  },
  critical: {
    icon: CircleAlert,
    iconClass: "text-red-600",
    rowClass: "border-red-100 bg-red-50/60"
  }
};

export function AIGrowthEmptyState({ icon: Icon = Sparkles }: { icon?: LucideIcon }) {
  return <EmptyState icon={Icon} title={AI_GROWTH_EMPTY_MESSAGE} />;
}

export function AIGrowthInsightRow({
  tone,
  text,
  detail
}: {
  tone: AIGrowthInsightTone;
  text: string;
  detail?: string;
}) {
  const { icon: Icon, iconClass, rowClass } = INSIGHT_TONE_STYLES[tone];

  return (
    <li className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${rowClass}`}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconClass}`} aria-hidden />
      {detail ? (
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{text}</p>
          <p className="text-xs text-foreground/65">{detail}</p>
        </div>
      ) : (
        <p className="text-sm text-foreground">{text}</p>
      )}
    </li>
  );
}

export const AI_GROWTH_DATE_FILTERS: { value: AIGrowthDateFilter; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
  { value: "year", label: "This Year" }
];

export function AIGrowthDateFilterSelect({
  value,
  onChange
}: {
  value: AIGrowthDateFilter;
  onChange: (value: AIGrowthDateFilter) => void;
}) {
  return (
    <select
      aria-label="Date range"
      value={value}
      onChange={(e) => onChange(e.target.value as AIGrowthDateFilter)}
      className="h-9 rounded-lg border border-accent/30 bg-white px-3 text-sm text-primary shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
    >
      {AI_GROWTH_DATE_FILTERS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export function AIGrowthSectionHeader({
  title,
  subtitle
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Sparkles className="h-5 w-5 text-primary" aria-hidden />
      <div>
        <h2 className="font-display text-lg font-bold text-primary">{title}</h2>
        <p className="text-xs text-foreground/55">{subtitle}</p>
      </div>
    </div>
  );
}

export function AIGrowthInsufficientDataCard({ icon: Icon = Sparkles }: { icon?: LucideIcon }) {
  return (
    <div className="flex min-h-[12rem] flex-col items-center justify-center rounded-xl border border-dashed border-accent/30 bg-white p-8 text-center shadow-card">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <p className="mt-4 max-w-md text-sm text-foreground/60">{AI_GROWTH_EMPTY_MESSAGE}</p>
    </div>
  );
}

export function AIGrowthPanelCard({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-accent/20 bg-white p-4 shadow-card">
      <div>
        <h2 className="text-sm font-semibold text-primary">{title}</h2>
        {subtitle ? <p className="text-xs text-foreground/50">{subtitle}</p> : null}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}
