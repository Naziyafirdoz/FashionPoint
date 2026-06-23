"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
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
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  MessageCircle,
  Palette,
  Ruler,
  Sparkles,
  Users,
  Zap,
  type LucideIcon
} from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminLiveStatus } from "@/components/admin/AdminLiveStatus";
import { EmptyState } from "@/components/admin/dashboard/EmptyState";
import { useLiveTimestamp } from "@/lib/admin/use-live-timestamp";
import { createClient } from "@/lib/supabase/client";
import {
  AI_MODULES,
  type AiAnalyticsSnapshot,
  type AiFeatureUsageRow,
  type UsageFeatureId
} from "@/lib/ai/analytics";

const CHART_HEIGHT = 220;

const FEATURE_ICONS: Record<UsageFeatureId, LucideIcon> = {
  size_finder: Ruler,
  color_matcher: Palette,
  style_recommender: Sparkles,
  stylist_chatbot: MessageCircle
};

type TrendRange = "daily" | "weekly" | "monthly";

function formatDateTime(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function KpiCard({
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

function FeatureUsageRow({ row }: { row: AiFeatureUsageRow }) {
  const Icon = FEATURE_ICONS[row.id];

  return (
    <div className="rounded-lg border border-accent/10 bg-blush/15 px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <p className="truncate text-sm font-semibold text-foreground">{row.name}</p>
        </div>
        <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
          Active
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-foreground/65">
        <span>
          <span className="font-semibold text-primary">{row.count}</span>{" "}
          {row.count === 1 ? "interaction" : "interactions"}
        </span>
        <span>{row.percentage}% of usage</span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" aria-hidden />
          Last used: {formatDateTime(row.lastUsed)}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/80">
        <div className="h-full rounded-full bg-primary" style={{ width: `${row.percentage}%` }} />
      </div>
    </div>
  );
}

async function fetchAnalytics(): Promise<AiAnalyticsSnapshot> {
  const res = await fetch("/api/admin/ai-analytics", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load AI analytics");
  const data = (await res.json()) as { analytics?: AiAnalyticsSnapshot };
  if (!data.analytics) throw new Error("AI analytics unavailable");
  return data.analytics;
}

export function AiFeaturesClient() {
  const [analytics, setAnalytics] = useState<AiAnalyticsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trendRange, setTrendRange] = useState<TrendRange>("daily");
  const [realtimeLive, setRealtimeLive] = useState(false);
  const { lastUpdated, touch } = useLiveTimestamp();

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    try {
      const data = await fetchAnalytics();
      setAnalytics(data);
      touch();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [touch]);

  useEffect(() => {
    void load(true);
  }, [load]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-ai-interactions")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ai_interactions" },
        () => {
          void load(false);
        }
      )
      .subscribe((status) => {
        setRealtimeLive(status === "SUBSCRIBED");
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  const trendData = useMemo(() => {
    if (!analytics) return [];
    if (trendRange === "weekly") return analytics.weeklyTrend;
    if (trendRange === "monthly") return analytics.monthlyTrend;
    return analytics.dailyTrend;
  }, [analytics, trendRange]);

  const hasLoggedData = (analytics?.totalInteractions ?? 0) > 0;
  const hasTrendData = hasLoggedData && trendData.length > 0;
  const successDisplay = analytics?.successRate != null ? `${analytics.successRate}%` : "—";

  return (
    <>
      <AdminHeader
        title="AI Features"
        action={<AdminLiveStatus lastUpdated={lastUpdated} live={realtimeLive} />}
      />

      <div className="space-y-4 bg-blush/30 p-4 sm:p-6">
        {loading ? (
          <p className="text-sm text-foreground/60">Loading AI analytics…</p>
        ) : error ? (
          <EmptyState icon={Bot} title="Unable to load analytics" description={error} />
        ) : !analytics ? (
          <EmptyState icon={Bot} title="No analytics data" description="AI usage data is not available." />
        ) : (
          <>
            {hasLoggedData ? (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <KpiCard
                    icon={Zap}
                    label="Total AI Interactions"
                    value={String(analytics.totalInteractions)}
                  />
                  <KpiCard
                    icon={Users}
                    label="Unique Signed-in Users"
                    value={String(analytics.uniqueUsers)}
                  />
                  <KpiCard
                    icon={Calendar}
                    label="Interactions Today"
                    value={String(analytics.interactionsToday)}
                  />
                  <KpiCard icon={Sparkles} label="Success Rate" value={successDisplay} />
                </div>

                <div className={`grid gap-4 ${hasTrendData ? "lg:grid-cols-2" : ""}`}>
                  <PanelCard title="Feature Usage" subtitle="How customers use each AI tool">
                    <div className="space-y-2">
                      {analytics.featureUsage.map((row) => (
                        <FeatureUsageRow key={row.id} row={row} />
                      ))}
                    </div>
                  </PanelCard>

                  {hasTrendData ? (
                    <PanelCard
                      title="AI Interaction Trend"
                      subtitle="Usage over time"
                      action={
                        <select
                          aria-label="Trend range"
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
                            <linearGradient id="aiUsageGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#7b0d2b" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#7b0d2b" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0d8e4" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                          <YAxis tick={{ fontSize: 10 }} width={32} allowDecimals={false} />
                          <Tooltip />
                          <Area
                            type="monotone"
                            dataKey="count"
                            stroke="#7b0d2b"
                            strokeWidth={2}
                            fill="url(#aiUsageGradient)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </PanelCard>
                  ) : null}
                </div>

                {(analytics.topQueries.length > 0 || analytics.topProducts.length > 0) && (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {analytics.topQueries.length > 0 ? (
                      <PanelCard title="Top User Queries" subtitle="Most common style questions and preferences">
                        <ul className="space-y-2">
                          {analytics.topQueries.map((row) => (
                            <li
                              key={row.query}
                              className="rounded-lg border border-accent/10 bg-blush/15 px-3 py-2.5"
                            >
                              <p className="line-clamp-2 text-sm font-medium text-foreground">{row.query}</p>
                              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-foreground/60">
                                <span>
                                  <span className="font-semibold text-primary">{row.count}</span>{" "}
                                  {row.count === 1 ? "time" : "times"}
                                </span>
                                <span>{row.percentage}% of queries</span>
                              </div>
                              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/80">
                                <div
                                  className="h-full rounded-full bg-secondary"
                                  style={{ width: `${row.percentage}%` }}
                                />
                              </div>
                            </li>
                          ))}
                        </ul>
                      </PanelCard>
                    ) : null}

                    {analytics.topProducts.length > 0 ? (
                      <PanelCard title="Top Recommended Products" subtitle="Most suggested items from style tools">
                        <ul className="space-y-2">
                          {analytics.topProducts.map((product, index) => (
                            <li
                              key={product.productId}
                              className="flex items-center gap-2.5 rounded-lg border border-accent/10 bg-blush/15 px-2 py-2"
                            >
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[9px] font-bold text-foreground">
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
                                    <Sparkles className="h-3.5 w-3.5" aria-hidden />
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-semibold text-foreground">{product.name}</p>
                                <p className="text-[10px] text-foreground/55">
                                  {product.count} recommendation{product.count === 1 ? "" : "s"}
                                </p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </PanelCard>
                    ) : null}
                  </div>
                )}

                {analytics.insights.length > 0 ? (
                  <PanelCard title="AI Insights" subtitle="Patterns from real customer usage">
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {analytics.insights.map((insight) => (
                        <li
                          key={insight.title}
                          className="rounded-lg border border-accent/10 bg-blush/15 px-3 py-3"
                        >
                          <p className="text-xs font-semibold text-primary">{insight.title}</p>
                          <p className="mt-1.5 text-[11px] leading-relaxed text-foreground/65">{insight.detail}</p>
                        </li>
                      ))}
                    </ul>
                  </PanelCard>
                ) : null}
              </>
            ) : (
              <EmptyState
                icon={Bot}
                title="No AI interactions yet"
                description="Usage will appear here when signed-in customers use Size Finder, Color Matcher, Style Recommender, or the AI Stylist Chatbot."
              />
            )}

            <PanelCard title="AI Modules" subtitle="Customer-facing tools on the storefront">
              <ul className="grid gap-2 sm:grid-cols-2">
                {AI_MODULES.map((name) => (
                  <li
                    key={name}
                    className="flex items-center gap-2 rounded-lg border border-accent/10 bg-blush/10 px-3 py-2.5 text-sm font-medium text-foreground"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                    {name}
                  </li>
                ))}
              </ul>
            </PanelCard>
          </>
        )}
      </div>
    </>
  );
}
