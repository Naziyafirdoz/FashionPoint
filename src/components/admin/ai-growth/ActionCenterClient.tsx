"use client";

import { AlertTriangle, CircleCheckBig, TrendingUp, type LucideIcon } from "lucide-react";
import { AIGrowthPageShell } from "@/components/admin/ai-growth/AIGrowthPageShell";
import { AIGrowthSectionHeader } from "@/components/admin/ai-growth/ai-growth-shared";
import { PanelCard } from "@/components/admin/analytics/analytics-shared";
import {
  ACTION_CENTER_PRIORITY_LABELS,
  ACTION_CENTER_SECTIONS,
  formatActionCenterTimestamp,
  type ActionCenterPriority,
  type ActionCenterSection
} from "@/lib/ai-growth/action-center";

const SECTION_ICONS: Record<ActionCenterSection["id"], LucideIcon> = {
  "high-priority": AlertTriangle,
  "opportunities": TrendingUp,
  "recent-improvements": CircleCheckBig
};

const PRIORITY_BADGE_STYLES: Record<ActionCenterPriority, string> = {
  high: "bg-red-100 text-red-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-emerald-100 text-emerald-800"
};

function ActionCenterCard({
  priority,
  problem,
  recommendation,
  reason,
  timestamp
}: {
  priority: ActionCenterPriority;
  problem: string;
  recommendation: string;
  reason: string;
  timestamp: string;
}) {
  return (
    <article className="rounded-lg border border-accent/15 bg-blush/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRIORITY_BADGE_STYLES[priority]}`}
        >
          {ACTION_CENTER_PRIORITY_LABELS[priority]} Priority
        </span>
        <time className="text-xs text-foreground/50" dateTime={timestamp}>
          {formatActionCenterTimestamp(timestamp)}
        </time>
      </div>

      <dl className="mt-3 space-y-3 text-sm">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-foreground/50">Problem</dt>
          <dd className="mt-1 text-foreground">{problem}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
            Recommendation
          </dt>
          <dd className="mt-1 font-medium text-primary">{recommendation}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-foreground/50">Reason</dt>
          <dd className="mt-1 text-foreground/75">{reason}</dd>
        </div>
      </dl>
    </article>
  );
}

export function ActionCenterClient() {
  return (
    <AIGrowthPageShell title="Next Actions">
      <div className="space-y-4">
        <AIGrowthSectionHeader
          title="Next Actions"
          subtitle="Actionable business recommendations — no charts, just next steps."
        />

        {ACTION_CENTER_SECTIONS.map((section) => {
          const Icon = SECTION_ICONS[section.id];

          return (
            <PanelCard
              key={section.id}
              title={section.title}
              subtitle={section.subtitle}
              action={
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
              }
              className="min-h-0"
            >
              <div className="space-y-3">
                {section.items.map((item) => (
                  <ActionCenterCard
                    key={item.id}
                    priority={item.priority}
                    problem={item.problem}
                    recommendation={item.recommendation}
                    reason={item.reason}
                    timestamp={item.timestamp}
                  />
                ))}
              </div>
            </PanelCard>
          );
        })}
      </div>
    </AIGrowthPageShell>
  );
}
