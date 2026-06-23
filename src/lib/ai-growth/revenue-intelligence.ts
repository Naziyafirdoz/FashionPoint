import { filterOrdersByStoreRange } from "@/lib/admin/store-analytics";
import type { AIGrowthDateFilter } from "@/components/admin/ai-growth/ai-growth-shared";
import type { Order, OrderStatus } from "@/types";

const REVENUE_EXCLUDED: Set<OrderStatus> = new Set(["cancelled", "returned"]);

export type RevenueDayRow = {
  key: string;
  label: string;
  revenue: number;
  orders: number;
};

export type PeriodMetricRow = {
  metric: string;
  current: number;
  previous: number;
};


export type RevenueInsightTone = "success" | "warning" | "info";

export type RevenueInsight = {
  id: string;
  tone: RevenueInsightTone;
  text: string;
};

export type RevenueIntelligenceSnapshot = {
  revenueGrowthPercent: number | null;
  ordersGrowthPercent: number | null;
  aovGrowthPercent: number | null;
  highestRevenueDay: RevenueDayRow | null;
  revenueTrend: RevenueDayRow[];
  periodComparison: PeriodMetricRow[];
  bestRevenueDays: RevenueDayRow[];
  revenueInsights: RevenueInsight[];
  hasCurrentPeriodData: boolean;
};

type PeriodWindow = {
  start: Date;
  end: Date;
};

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function ordersBetween(orders: Order[], start: Date, end: Date): Order[] {
  return orders.filter((order) => {
    const created = new Date(order.created_at);
    return created >= start && created <= end;
  });
}

function getCurrentPeriodWindow(filter: AIGrowthDateFilter): PeriodWindow {
  const now = new Date();

  switch (filter) {
    case "today":
      return { start: startOfDay(now), end: now };
    case "7d": {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    }
    case "30d": {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    }
    case "90d": {
      const start = new Date(now);
      start.setDate(start.getDate() - 90);
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    }
    case "year":
      return { start: new Date(now.getFullYear(), 0, 1), end: now };
    default:
      return { start: new Date(0), end: now };
  }
}

function getPreviousPeriodWindow(filter: AIGrowthDateFilter): PeriodWindow {
  const now = new Date();
  const current = getCurrentPeriodWindow(filter);

  switch (filter) {
    case "today": {
      const yesterdayStart = new Date(current.start);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      return { start: yesterdayStart, end: endOfDay(yesterdayStart) };
    }
    case "7d":
    case "30d":
    case "90d": {
      const previousEnd = new Date(current.start);
      previousEnd.setMilliseconds(-1);
      const previousStart = new Date(current.start);
      const days =
        filter === "7d" ? 7 : filter === "30d" ? 30 : 90;
      previousStart.setDate(previousStart.getDate() - days);
      previousStart.setHours(0, 0, 0, 0);
      return { start: previousStart, end: previousEnd };
    }
    case "year": {
      const previousYearStart = new Date(now.getFullYear() - 1, 0, 1);
      const previousYearEnd = new Date(
        now.getFullYear() - 1,
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999
      );
      return { start: previousYearStart, end: previousYearEnd };
    }
    default:
      return { start: new Date(0), end: new Date(0) };
  }
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDayLabel(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short"
  });
}

function formatDayHighlightLabel(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function sumRevenue(orders: Order[]): number {
  let total = 0;
  for (const order of orders) {
    if (!REVENUE_EXCLUDED.has(order.status)) {
      total += Number(order.total) || 0;
    }
  }
  return total;
}

function averageOrderValue(orders: Order[]): number {
  const revenueOrders = orders.filter((order) => !REVENUE_EXCLUDED.has(order.status));
  if (revenueOrders.length === 0) return 0;
  return sumRevenue(revenueOrders) / revenueOrders.length;
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

function buildDailyBuckets(orders: Order[]): RevenueDayRow[] {
  const buckets = new Map<string, { revenue: number; orders: number }>();

  for (const order of orders) {
    const key = dayKey(order.created_at);
    const entry = buckets.get(key) ?? { revenue: 0, orders: 0 };
    entry.orders += 1;
    if (!REVENUE_EXCLUDED.has(order.status)) {
      entry.revenue += Number(order.total) || 0;
    }
    buckets.set(key, entry);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, data]) => ({
      key,
      label: formatDayLabel(key),
      revenue: data.revenue,
      orders: data.orders
    }));
}

function formatCurrencyForInsight(value: number): string {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function formatSignedPercent(percent: number): string {
  if (percent > 0) return `+${percent}%`;
  if (percent < 0) return `${percent}%`;
  return "0%";
}

function growthTone(percent: number): RevenueInsightTone {
  if (percent > 0) return "success";
  if (percent < 0) return "warning";
  return "info";
}

function formatRevenueGrowthInsight(current: number, previous: number, percent: number): string {
  return `Revenue moved from ${formatCurrencyForInsight(previous)} to ${formatCurrencyForInsight(current)} (${formatSignedPercent(percent)} vs previous period).`;
}

function formatHighestDayInsight(day: RevenueDayRow): string {
  return `Peak day ${formatDayHighlightLabel(day.key)}: ${formatCurrencyForInsight(day.revenue)}, ${day.orders} ${day.orders === 1 ? "order" : "orders"}.`;
}

function formatAovInsight(current: number, previous: number, percent: number): string {
  return `Average order value moved from ${formatCurrencyForInsight(previous)} to ${formatCurrencyForInsight(current)} (${formatSignedPercent(percent)}).`;
}

function formatAverageDailyInsight(amount: number, calendarDays: number, periodRevenue: number): string {
  return `Average daily revenue ${formatCurrencyForInsight(amount)} across ${calendarDays} ${calendarDays === 1 ? "day" : "days"} (period total ${formatCurrencyForInsight(periodRevenue)}).`;
}

function formatTopDaysContributionInsight(
  dayCount: number,
  contributionPercent: number,
  topRevenue: number,
  periodRevenue: number
): string {
  return `Top ${dayCount} revenue ${dayCount === 1 ? "day" : "days"}: ${formatCurrencyForInsight(topRevenue)} (${contributionPercent}% of ${formatCurrencyForInsight(periodRevenue)}).`;
}

function formatLatestVsPeakInsight(
  latest: RevenueDayRow,
  peak: RevenueDayRow,
  percentOfPeak: number
): string {
  return `Latest day ${formatDayHighlightLabel(latest.key)}: ${formatCurrencyForInsight(latest.revenue)} (${percentOfPeak}% of peak ${formatDayHighlightLabel(peak.key)}: ${formatCurrencyForInsight(peak.revenue)}).`;
}

function formatPeakVsAverageInsight(
  peakRevenue: number,
  averageDailyRevenue: number,
  multiple: number
): string {
  return `Peak day ${formatCurrencyForInsight(peakRevenue)} vs daily average ${formatCurrencyForInsight(averageDailyRevenue)} (${multiple.toFixed(1)}×).`;
}

function countCalendarDaysInPeriod(window: PeriodWindow): number {
  const start = startOfDay(window.start);
  const end = startOfDay(window.end);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1);
}

function hasRevenueOrders(orders: Order[]): boolean {
  return orders.some((order) => !REVENUE_EXCLUDED.has(order.status));
}

function buildRevenueInsights(input: {
  revenueGrowthPercent: number | null;
  aovGrowthPercent: number | null;
  currentRevenue: number;
  previousRevenue: number;
  currentAov: number;
  previousAov: number;
  hasPreviousPeriod: boolean;
  hasPreviousRevenueOrders: boolean;
  hasCurrentRevenueOrders: boolean;
  highestRevenueDay: RevenueDayRow | null;
  periodRevenue: number;
  currentWindow: PeriodWindow;
  daysWithRevenue: RevenueDayRow[];
  dailyBuckets: RevenueDayRow[];
}): RevenueInsight[] {
  const insights: RevenueInsight[] = [];

  if (
    input.hasPreviousPeriod &&
    input.revenueGrowthPercent !== null &&
    (input.currentRevenue > 0 || input.previousRevenue > 0)
  ) {
    insights.push({
      id: "revenue-growth",
      tone: growthTone(input.revenueGrowthPercent),
      text: formatRevenueGrowthInsight(
        input.currentRevenue,
        input.previousRevenue,
        input.revenueGrowthPercent
      )
    });
  }

  if (input.highestRevenueDay && input.highestRevenueDay.revenue > 0) {
    insights.push({
      id: "highest-day",
      tone: "info",
      text: formatHighestDayInsight(input.highestRevenueDay)
    });
  }

  if (
    input.hasPreviousPeriod &&
    input.hasPreviousRevenueOrders &&
    input.hasCurrentRevenueOrders &&
    input.aovGrowthPercent !== null
  ) {
    insights.push({
      id: "aov-trend",
      tone: growthTone(input.aovGrowthPercent),
      text: formatAovInsight(input.currentAov, input.previousAov, input.aovGrowthPercent)
    });
  }

  if (input.periodRevenue > 0) {
    const calendarDays = countCalendarDaysInPeriod(input.currentWindow);
    const averageDailyRevenue = input.periodRevenue / calendarDays;

    insights.push({
      id: "average-daily-revenue",
      tone: "info",
      text: formatAverageDailyInsight(averageDailyRevenue, calendarDays, input.periodRevenue)
    });

    const topDays = [...input.daysWithRevenue]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3);
    const topDaysRevenue = topDays.reduce((sum, day) => sum + day.revenue, 0);
    const topDaysContributionPercent = Math.round((topDaysRevenue / input.periodRevenue) * 100);

    if (topDays.length > 0 && topDaysRevenue > 0) {
      insights.push({
        id: "top-days-contribution",
        tone: "info",
        text: formatTopDaysContributionInsight(
          topDays.length,
          topDaysContributionPercent,
          topDaysRevenue,
          input.periodRevenue
        )
      });
    }

    if (input.dailyBuckets.length >= 2 && input.highestRevenueDay && input.highestRevenueDay.revenue > 0) {
      const latestDay = input.dailyBuckets[input.dailyBuckets.length - 1];
      const percentOfPeak = Math.round(
        (latestDay.revenue / input.highestRevenueDay.revenue) * 100
      );

      insights.push({
        id: "latest-vs-peak",
        tone: percentOfPeak < 100 ? "warning" : "success",
        text: formatLatestVsPeakInsight(latestDay, input.highestRevenueDay, percentOfPeak)
      });
    }

    if (
      input.highestRevenueDay &&
      input.highestRevenueDay.revenue > 0 &&
      averageDailyRevenue > 0 &&
      input.daysWithRevenue.length >= 2
    ) {
      const peakMultiple = input.highestRevenueDay.revenue / averageDailyRevenue;

      if (peakMultiple >= 2) {
        insights.push({
          id: "peak-vs-average",
          tone: "warning",
          text: formatPeakVsAverageInsight(
            input.highestRevenueDay.revenue,
            averageDailyRevenue,
            peakMultiple
          )
        });
      }
    }
  }

  return insights;
}

export function computeRevenueIntelligence(
  orders: Order[],
  filter: AIGrowthDateFilter
): RevenueIntelligenceSnapshot {
  const currentWindow = getCurrentPeriodWindow(filter);
  const previousWindow = getPreviousPeriodWindow(filter);

  const currentOrders = ordersBetween(orders, currentWindow.start, currentWindow.end);
  const previousOrders = ordersBetween(orders, previousWindow.start, previousWindow.end);
  const periodOrders = filterOrdersByStoreRange(orders, filter);

  const currentRevenue = sumRevenue(currentOrders);
  const previousRevenue = sumRevenue(previousOrders);
  const currentOrderCount = currentOrders.length;
  const previousOrderCount = previousOrders.length;
  const currentAov = averageOrderValue(currentOrders);
  const previousAov = averageOrderValue(previousOrders);

  const revenueGrowthPercent = pctChange(currentRevenue, previousRevenue);
  const ordersGrowthPercent = pctChange(currentOrderCount, previousOrderCount);
  const aovGrowthPercent = pctChange(currentAov, previousAov);

  const dailyBuckets = buildDailyBuckets(periodOrders);
  const daysWithRevenue = dailyBuckets.filter((day) => day.revenue > 0 || day.orders > 0);
  const highestRevenueDay =
    daysWithRevenue.length > 0
      ? daysWithRevenue.reduce((best, row) => (row.revenue > best.revenue ? row : best))
      : null;

  const bestRevenueDays = [...daysWithRevenue]
    .sort((a, b) => {
      if (b.revenue !== a.revenue) return b.revenue - a.revenue;
      return b.orders - a.orders;
    })
    .slice(0, 10)
    .map((day) => ({
      ...day,
      label: formatDayHighlightLabel(day.key)
    }));

  const hasPreviousPeriod = previousOrders.length > 0;
  const hasPreviousRevenueOrders = hasRevenueOrders(previousOrders);
  const hasCurrentRevenueOrders = hasRevenueOrders(currentOrders);
  const periodRevenue = sumRevenue(periodOrders);
  const revenueInsights = buildRevenueInsights({
    revenueGrowthPercent,
    aovGrowthPercent,
    currentRevenue,
    previousRevenue,
    currentAov,
    previousAov,
    hasPreviousPeriod,
    hasPreviousRevenueOrders,
    hasCurrentRevenueOrders,
    highestRevenueDay,
    periodRevenue,
    currentWindow,
    daysWithRevenue,
    dailyBuckets
  });

  return {
    revenueGrowthPercent,
    ordersGrowthPercent,
    aovGrowthPercent,
    highestRevenueDay: highestRevenueDay
      ? { ...highestRevenueDay, label: formatDayHighlightLabel(highestRevenueDay.key) }
      : null,
    revenueTrend: dailyBuckets,
    periodComparison: [
      { metric: "Revenue", current: currentRevenue, previous: previousRevenue },
      { metric: "Orders", current: currentOrderCount, previous: previousOrderCount },
      { metric: "AOV", current: Math.round(currentAov), previous: Math.round(previousAov) }
    ],
    bestRevenueDays,
    revenueInsights,
    hasCurrentPeriodData: currentOrders.length > 0
  };
}
