import type { AiInteraction } from "@/types";

export type UsageFeatureId =
  | "size_finder"
  | "color_matcher"
  | "style_recommender"
  | "stylist_chatbot";

export const AI_MODULES = [
  "Size Finder",
  "Saree Color Matcher",
  "Style Recommender",
  "AI Stylist Chatbot"
] as const;

const USAGE_FEATURES: { id: UsageFeatureId; name: string }[] = [
  { id: "size_finder", name: "Size Finder" },
  { id: "color_matcher", name: "Saree Color Matcher" },
  { id: "style_recommender", name: "Style Recommender" },
  { id: "stylist_chatbot", name: "AI Stylist Chatbot" }
];

export type AiFeatureUsageRow = {
  id: UsageFeatureId;
  name: string;
  status: "Active";
  count: number;
  percentage: number;
  lastUsed: string | null;
};

export type AiTrendPoint = {
  key: string;
  label: string;
  count: number;
};

export type AiRecommendedProductRow = {
  productId: string;
  name: string;
  image?: string;
  count: number;
};

export type AiQueryRow = {
  query: string;
  count: number;
  percentage: number;
};

export type AiInsight = {
  title: string;
  detail: string;
};

export type AiAnalyticsSnapshot = {
  totalInteractions: number;
  uniqueUsers: number;
  interactionsToday: number;
  successRate: number | null;
  featureUsage: AiFeatureUsageRow[];
  dailyTrend: AiTrendPoint[];
  weeklyTrend: AiTrendPoint[];
  monthlyTrend: AiTrendPoint[];
  topProducts: AiRecommendedProductRow[];
  topQueries: AiQueryRow[];
  insights: AiInsight[];
};

function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function weekKey(iso: string) {
  const d = new Date(iso);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return dayKey(monday.toISOString());
}

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatDayLabel(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function formatWeekLabel(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function formatMonthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function isStylistChatbot(row: AiInteraction): boolean {
  const message = row.input_data?.message;
  return row.feature === "style_assistant" && typeof message === "string" && message.trim().length > 0;
}

function rowsForUsageFeature(id: UsageFeatureId, interactions: AiInteraction[]): AiInteraction[] {
  switch (id) {
    case "size_finder":
      return interactions.filter((i) => i.feature === "size_finder");
    case "color_matcher":
      return interactions.filter((i) => i.feature === "color_matcher");
    case "style_recommender":
      return interactions.filter((i) => i.feature === "style_assistant" && !isStylistChatbot(i));
    case "stylist_chatbot":
      return interactions.filter(isStylistChatbot);
    default:
      return [];
  }
}

function buildTrend(
  interactions: AiInteraction[],
  keyFn: (iso: string) => string,
  labelFn: (key: string) => string,
  limit: number
): AiTrendPoint[] {
  const counts = new Map<string, number>();
  for (const row of interactions) {
    const key = keyFn(row.created_at);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-limit)
    .map(([key, count]) => ({ key, label: labelFn(key), count }));
}

function extractStyleProductIds(output: Record<string, unknown> | undefined): string[] {
  if (!output) return [];
  const ids: string[] = [];
  const recommendations = output.recommendations;
  if (Array.isArray(recommendations)) {
    for (const rec of recommendations) {
      if (rec && typeof rec === "object" && typeof (rec as { productId?: string }).productId === "string") {
        ids.push((rec as { productId: string }).productId);
      }
    }
  }
  const productIds = output.productIds;
  if (Array.isArray(productIds)) {
    for (const id of productIds) {
      if (typeof id === "string") ids.push(id);
    }
  }
  return ids;
}

function extractQuery(input: Record<string, unknown> | undefined): string | null {
  if (!input) return null;
  if (typeof input.message === "string" && input.message.trim()) {
    return input.message.trim();
  }
  const prefs = ["occasion", "stylePreference", "neckStyle", "sleeveStyle", "budget"]
    .map((key) => {
      const value = input[key];
      if (value == null || value === "") return null;
      if (key === "budget") return `Budget ₹${value}`;
      return String(value);
    })
    .filter(Boolean);
  return prefs.length ? prefs.join(" · ") : null;
}

function successRateForRows(rows: AiInteraction[]): number | null {
  if (rows.length === 0) return null;
  const successful = rows.filter((r) => r.was_successful !== false).length;
  return Math.round((successful / rows.length) * 100);
}

export function computeAiAnalytics(
  interactions: AiInteraction[],
  productNames: Map<string, { name: string; image?: string }>
): AiAnalyticsSnapshot {
  const totalInteractions = interactions.length;
  const uniqueUsers = new Set(interactions.map((i) => i.user_id).filter(Boolean)).size;
  const interactionsToday = interactions.filter((i) => isToday(i.created_at)).length;

  const successful = interactions.filter((i) => i.was_successful !== false).length;
  const successRate = totalInteractions > 0 ? Math.round((successful / totalInteractions) * 100) : null;

  const featureUsage: AiFeatureUsageRow[] = USAGE_FEATURES.map((feature) => {
    const rows = rowsForUsageFeature(feature.id, interactions);
    const count = rows.length;
    const lastUsed =
      rows.length > 0
        ? rows.reduce(
            (latest, row) => (row.created_at > latest ? row.created_at : latest),
            rows[0].created_at
          )
        : null;

    return {
      id: feature.id,
      name: feature.name,
      status: "Active",
      count,
      percentage: totalInteractions > 0 ? Math.round((count / totalInteractions) * 100) : 0,
      lastUsed
    };
  });

  const productCounts = new Map<string, number>();
  for (const row of interactions) {
    if (row.feature !== "style_assistant") continue;
    for (const id of extractStyleProductIds(row.output_data)) {
      productCounts.set(id, (productCounts.get(id) ?? 0) + 1);
    }
  }

  const topProducts: AiRecommendedProductRow[] = [...productCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([productId, count]) => {
      const meta = productNames.get(productId);
      return {
        productId,
        name: meta?.name ?? "Unknown product",
        image: meta?.image,
        count
      };
    });

  const queryCounts = new Map<string, number>();
  for (const row of interactions) {
    if (row.feature !== "style_assistant") continue;
    const query = extractQuery(row.input_data);
    if (!query) continue;
    queryCounts.set(query, (queryCounts.get(query) ?? 0) + 1);
  }

  const totalQueries = [...queryCounts.values()].reduce((sum, n) => sum + n, 0);

  const topQueries: AiQueryRow[] = [...queryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([query, count]) => ({
      query,
      count,
      percentage: totalQueries > 0 ? Math.round((count / totalQueries) * 100) : 0
    }));

  const insights: AiInsight[] = [];

  if (totalInteractions > 0) {
    const topFeature = [...featureUsage]
      .filter((f) => f.count > 0)
      .sort((a, b) => b.count - a.count)[0];

    if (topFeature) {
      insights.push({
        title: "Most Used Feature",
        detail: `${topFeature.name} leads with ${topFeature.count} interactions (${topFeature.percentage}% of all usage).`
      });
    }

    const peakDay = buildTrend(interactions, dayKey, formatDayLabel, 90).sort((a, b) => b.count - a.count)[0];
    if (peakDay && peakDay.count > 0) {
      insights.push({
        title: "Peak Usage Day",
        detail: `${peakDay.label} recorded ${peakDay.count} interactions — the busiest day on record.`
      });
    }

    const featureRates = featureUsage
      .filter((f) => f.count > 0)
      .map((f) => ({
        name: f.name,
        rate: successRateForRows(rowsForUsageFeature(f.id, interactions))
      }))
      .filter((f): f is { name: string; rate: number } => f.rate != null);

    if (featureRates.length > 0) {
      const best = featureRates.reduce((a, b) => (b.rate > a.rate ? b : a));
      insights.push({
        title: "Highest Success Rate",
        detail: `${best.name} completed successfully ${best.rate}% of the time.`
      });
    }

    insights.push({
      title: "Signed-in users only",
      detail: `Usage is tracked for ${uniqueUsers} signed-in customer${uniqueUsers === 1 ? "" : "s"}. Guest sessions are not included in these figures.`
    });
  }

  return {
    totalInteractions,
    uniqueUsers,
    interactionsToday,
    successRate,
    featureUsage,
    dailyTrend: buildTrend(interactions, dayKey, formatDayLabel, 30),
    weeklyTrend: buildTrend(interactions, weekKey, formatWeekLabel, 12),
    monthlyTrend: buildTrend(interactions, monthKey, formatMonthLabel, 12),
    topProducts,
    topQueries,
    insights
  };
}
