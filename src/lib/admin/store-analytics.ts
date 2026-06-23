import type { Order, OrderStatus } from "@/types";
import { normalizeOrderItems } from "@/lib/orders/order-items";

const REVENUE_EXCLUDED: Set<OrderStatus> = new Set(["cancelled", "returned"]);

export type StoreAnalyticsFilter = "today" | "7d" | "30d" | "90d" | "year";

export const STORE_ANALYTICS_FILTERS: { value: StoreAnalyticsFilter; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
  { value: "year", label: "This Year" }
];

export type StoreOverview = {
  totalRevenue: number;
  totalOrders: number;
  productsSold: number;
  averageOrderValue: number;
};

export type SalesTrendPoint = {
  key: string;
  label: string;
  revenue: number;
  orders: number;
};


export type OrderPipelineStage = {
  key: string;
  label: string;
  count: number;
  percentage: number;
};

export type OrderRateMetric = {
  numerator: number;
  denominator: number;
  percent: number | null;
};

export type OrderTimingMetric = {
  label: string;
  averageHours: number;
  sampleSize: number;
};

export type OrderDayHighlight = {
  label: string;
  count: number;
};

export type OrderHourHighlight = {
  label: string;
  count: number;
};

export type OrderAnalyticsSnapshot = {
  pipeline: OrderPipelineStage[];
  distribution: OrderPipelineStage[];
  flowStages: OrderPipelineStage[];
  completionRate: OrderRateMetric;
  cancellationRate: OrderRateMetric;
  avgProcessingTime: OrderTimingMetric | null;
  avgShippingTime: OrderTimingMetric | null;
  avgDeliveryTime: OrderTimingMetric | null;
  topOrderDay: OrderDayHighlight | null;
  peakOrderHour: OrderHourHighlight | null;
};

export type StoreAnalyticsSnapshot = {
  overview: StoreOverview;
  dailyTrend: SalesTrendPoint[];
  weeklyTrend: SalesTrendPoint[];
  monthlyTrend: SalesTrendPoint[];
  salesAnalytics: SalesAnalyticsSnapshot;
  orderAnalytics: OrderAnalyticsSnapshot;
  productAnalytics: ProductAnalyticsSnapshot;
};

export type StoreTopProduct = {
  productId: string;
  name: string;
  image?: string;
  quantitySold: number;
  revenue: number;
};

export type ProductAnalyticsRow = {
  productId: string;
  name: string;
  image?: string;
  quantitySold: number;
  revenue: number;
  orderCount: number;
  revenueSharePercent: number | null;
};

export type ProductNeverSoldRow = {
  productId: string;
  name: string;
  image?: string;
  categoryName: string | null;
};

export type CategoryDistributionRow = {
  categoryId: string;
  name: string;
  revenue: number;
  percentage: number;
};

export type ProductAnalyticsSnapshot = {
  topSellingProducts: ProductAnalyticsRow[];
  mostOrderedProducts: ProductAnalyticsRow[];
  slowMovingProducts: ProductAnalyticsRow[];
  revenueContribution: ProductAnalyticsRow[];
  top10ByRevenue: ProductAnalyticsRow[];
  categoryPerformance: CategoryPerformanceRow[];
  categoryDistribution: CategoryDistributionRow[];
  activeProductsCount: number;
  neverSoldProducts: ProductNeverSoldRow[];
  bestProduct: ProductAnalyticsRow | null;
};

export type AnalyticsProductInput = {
  id: string;
  name: string;
  images: string[];
  status: string;
  category_id: string | null;
  category_name: string | null;
};

export type CategoryPerformanceRow = {
  categoryId: string;
  name: string;
  revenue: number;
  orders: number;
  unitsSold: number;
};

export type PeriodComparison = {
  label: string;
  current: number;
  previous: number | null;
  changePercent: number | null;
};

export type SalesDayHighlight = {
  label: string;
  revenue: number;
  orders: number;
};

export type TopRevenuePeriod = {
  label: string;
  revenue: number;
  orders: number;
};

export type SalesAnalyticsSnapshot = {
  revenueTrends: {
    today: PeriodComparison;
    last7Days: PeriodComparison;
    last30Days: PeriodComparison;
    thisYear: PeriodComparison;
  };
  orderTrends: {
    today: PeriodComparison;
    last7Days: PeriodComparison;
    last30Days: PeriodComparison;
  };
  productsSoldTrends: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  aovTrends: {
    today: PeriodComparison;
    last7Days: PeriodComparison;
    last30Days: PeriodComparison;
  };
  bestSalesDay: SalesDayHighlight | null;
  worstSalesDay: SalesDayHighlight | null;
  topRevenuePeriods: {
    bestDay: TopRevenuePeriod | null;
    bestWeek: TopRevenuePeriod | null;
    bestMonth: TopRevenuePeriod | null;
  };
};

const STATUS_ANALYTICS_KEYS: { key: string; label: string; statuses: string[] }[] = [
  { key: "processing", label: "Processing", statuses: ["processing"] },
  { key: "confirmed", label: "Confirmed", statuses: ["confirmed"] },
  { key: "packed", label: "Packed", statuses: ["packed", "packing_assigned"] },
  { key: "ready_to_ship", label: "Ready For Shipping", statuses: ["ready_to_ship"] },
  { key: "shipped", label: "Shipped", statuses: ["shipped", "out_for_delivery"] },
  { key: "delivered", label: "Delivered", statuses: ["delivered"] },
  { key: "cancelled", label: "Cancelled", statuses: ["cancelled"] }
];

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function ordersBetween(orders: Order[], start: Date, end: Date): Order[] {
  return orders.filter((o) => {
    const created = new Date(o.created_at);
    return created >= start && created <= end;
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

function sumProductsSold(orders: Order[]): number {
  let total = 0;
  for (const order of orders) {
    if (REVENUE_EXCLUDED.has(order.status)) continue;
    for (const item of normalizeOrderItems(order.items)) {
      total += item.quantity;
    }
  }
  return total;
}

function averageOrderValue(orders: Order[]): number {
  const revenueOrders = orders.filter((o) => !REVENUE_EXCLUDED.has(o.status));
  if (revenueOrders.length === 0) return 0;
  return sumRevenue(revenueOrders) / revenueOrders.length;
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

function buildPeriodComparison(
  label: string,
  currentOrders: Order[],
  previousOrders: Order[],
  valueFn: (orders: Order[]) => number
): PeriodComparison {
  const current = valueFn(currentOrders);
  const hasPrevious = previousOrders.length > 0;
  const previous = hasPrevious ? valueFn(previousOrders) : null;

  return {
    label,
    current,
    previous,
    changePercent: hasPrevious && previous !== null ? pctChange(current, previous) : null
  };
}

function formatDayHighlightLabel(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function computeSalesAnalytics(orders: Order[]): SalesAnalyticsSnapshot {
  const now = new Date();
  const todayStart = startOfToday();
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const yesterdayEnd = endOfDay(yesterdayStart);

  const last7Start = new Date(now);
  last7Start.setDate(last7Start.getDate() - 7);
  last7Start.setHours(0, 0, 0, 0);
  const prev7End = new Date(last7Start);
  prev7End.setMilliseconds(-1);
  const prev7Start = new Date(last7Start);
  prev7Start.setDate(prev7Start.getDate() - 7);

  const last30Start = new Date(now);
  last30Start.setDate(last30Start.getDate() - 30);
  last30Start.setHours(0, 0, 0, 0);
  const prev30End = new Date(last30Start);
  prev30End.setMilliseconds(-1);
  const prev30Start = new Date(last30Start);
  prev30Start.setDate(prev30Start.getDate() - 30);

  const yearStart = new Date(now.getFullYear(), 0, 1);
  const prevYearStart = new Date(now.getFullYear() - 1, 0, 1);
  const prevYearEnd = new Date(
    now.getFullYear() - 1,
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999
  );

  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  const todayOrders = ordersBetween(orders, todayStart, now);
  const yesterdayOrders = ordersBetween(orders, yesterdayStart, yesterdayEnd);
  const last7Orders = ordersBetween(orders, last7Start, now);
  const prev7Orders = ordersBetween(orders, prev7Start, prev7End);
  const last30Orders = ordersBetween(orders, last30Start, now);
  const prev30Orders = ordersBetween(orders, prev30Start, prev30End);
  const yearOrders = ordersBetween(orders, yearStart, now);
  const prevYearOrders = ordersBetween(orders, prevYearStart, prevYearEnd);
  const weekOrders = ordersBetween(orders, weekStart, now);
  const monthOrders = ordersBetween(orders, monthStart, now);

  const dailyBuckets = buildSalesTrend(orders, dayKey, formatDayLabel, Number.MAX_SAFE_INTEGER);
  const weeklyBuckets = buildSalesTrend(orders, weekKey, formatWeekLabel, Number.MAX_SAFE_INTEGER);
  const monthlyBuckets = buildSalesTrend(orders, monthKey, formatMonthLabel, Number.MAX_SAFE_INTEGER);

  const daysWithRevenue = dailyBuckets.filter((d) => d.revenue > 0 || d.orders > 0);
  const bestDayBucket =
    daysWithRevenue.length > 0
      ? daysWithRevenue.reduce((best, row) => (row.revenue > best.revenue ? row : best))
      : null;
  const worstDayBucket =
    daysWithRevenue.length >= 2
      ? daysWithRevenue.reduce((worst, row) => (row.revenue < worst.revenue ? row : worst))
      : null;

  const bestWeekBucket =
    weeklyBuckets.length > 0
      ? weeklyBuckets.reduce((best, row) => (row.revenue > best.revenue ? row : best))
      : null;
  const bestMonthBucket =
    monthlyBuckets.length > 0
      ? monthlyBuckets.reduce((best, row) => (row.revenue > best.revenue ? row : best))
      : null;

  return {
    revenueTrends: {
      today: buildPeriodComparison("Revenue Today", todayOrders, yesterdayOrders, sumRevenue),
      last7Days: buildPeriodComparison("Revenue Last 7 Days", last7Orders, prev7Orders, sumRevenue),
      last30Days: buildPeriodComparison("Revenue Last 30 Days", last30Orders, prev30Orders, sumRevenue),
      thisYear: buildPeriodComparison("Revenue This Year", yearOrders, prevYearOrders, sumRevenue)
    },
    orderTrends: {
      today: buildPeriodComparison(
        "Orders Today",
        todayOrders,
        yesterdayOrders,
        (rows) => rows.length
      ),
      last7Days: buildPeriodComparison(
        "Orders Last 7 Days",
        last7Orders,
        prev7Orders,
        (rows) => rows.length
      ),
      last30Days: buildPeriodComparison(
        "Orders Last 30 Days",
        last30Orders,
        prev30Orders,
        (rows) => rows.length
      )
    },
    productsSoldTrends: {
      today: sumProductsSold(todayOrders),
      thisWeek: sumProductsSold(weekOrders),
      thisMonth: sumProductsSold(monthOrders)
    },
    aovTrends: {
      today: buildPeriodComparison("AOV Today", todayOrders, yesterdayOrders, averageOrderValue),
      last7Days: buildPeriodComparison("AOV Last 7 Days", last7Orders, prev7Orders, averageOrderValue),
      last30Days: buildPeriodComparison(
        "AOV Last 30 Days",
        last30Orders,
        prev30Orders,
        averageOrderValue
      )
    },
    bestSalesDay: bestDayBucket
      ? {
          label: formatDayHighlightLabel(bestDayBucket.key),
          revenue: bestDayBucket.revenue,
          orders: bestDayBucket.orders
        }
      : null,
    worstSalesDay: worstDayBucket
      ? {
          label: formatDayHighlightLabel(worstDayBucket.key),
          revenue: worstDayBucket.revenue,
          orders: worstDayBucket.orders
        }
      : null,
    topRevenuePeriods: {
      bestDay: bestDayBucket
        ? {
            label: formatDayHighlightLabel(bestDayBucket.key),
            revenue: bestDayBucket.revenue,
            orders: bestDayBucket.orders
          }
        : null,
      bestWeek: bestWeekBucket
        ? { label: bestWeekBucket.label, revenue: bestWeekBucket.revenue, orders: bestWeekBucket.orders }
        : null,
      bestMonth: bestMonthBucket
        ? {
            label: bestMonthBucket.label,
            revenue: bestMonthBucket.revenue,
            orders: bestMonthBucket.orders
          }
        : null
    }
  };
}

export function filterOrdersByStoreRange(orders: Order[], filter: StoreAnalyticsFilter): Order[] {
  const now = new Date();
  let cutoff: Date;

  switch (filter) {
    case "today":
      cutoff = startOfToday();
      break;
    case "7d":
      cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 7);
      cutoff.setHours(0, 0, 0, 0);
      break;
    case "30d":
      cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 30);
      cutoff.setHours(0, 0, 0, 0);
      break;
    case "90d":
      cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 90);
      cutoff.setHours(0, 0, 0, 0);
      break;
    case "year":
      cutoff = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      return orders;
  }

  return orders.filter((o) => new Date(o.created_at) >= cutoff);
}

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

function buildSalesTrend(
  orders: Order[],
  keyFn: (iso: string) => string,
  labelFn: (key: string) => string,
  limit: number
): SalesTrendPoint[] {
  const buckets = new Map<string, { revenue: number; orders: number }>();

  for (const order of orders) {
    const key = keyFn(order.created_at);
    const entry = buckets.get(key) ?? { revenue: 0, orders: 0 };
    entry.orders += 1;
    if (!REVENUE_EXCLUDED.has(order.status)) {
      entry.revenue += Number(order.total) || 0;
    }
    buckets.set(key, entry);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-limit)
    .map(([key, data]) => ({
      key,
      label: labelFn(key),
      revenue: data.revenue,
      orders: data.orders
    }));
}

function computeOverview(orders: Order[]): StoreOverview {
  let totalRevenue = 0;
  let productsSold = 0;
  let revenueOrderCount = 0;

  for (const order of orders) {
    if (!REVENUE_EXCLUDED.has(order.status)) {
      totalRevenue += Number(order.total) || 0;
      revenueOrderCount += 1;
      for (const item of normalizeOrderItems(order.items)) {
        productsSold += item.quantity;
      }
    }
  }

  return {
    totalRevenue,
    totalOrders: orders.length,
    productsSold,
    averageOrderValue: revenueOrderCount > 0 ? totalRevenue / revenueOrderCount : 0
  };
}

function hoursBetween(start?: string, end?: string): number | null {
  if (!start || !end) return null;
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) return null;
  return (endMs - startMs) / (1000 * 60 * 60);
}

function averageHours(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatHourRange(hour: number): string {
  const format = (h: number) => {
    const d = new Date();
    d.setHours(h, 0, 0, 0);
    return d.toLocaleTimeString("en-IN", { hour: "numeric", hour12: true });
  };
  const endHour = hour === 23 ? 0 : hour + 1;
  return `${format(hour)} – ${format(endHour)}`;
}

function computePipelineStages(orders: Order[]): OrderPipelineStage[] {
  const counts = new Map<string, number>();
  for (const order of orders) {
    counts.set(order.status, (counts.get(order.status) ?? 0) + 1);
  }

  const total = orders.length;

  return STATUS_ANALYTICS_KEYS.map(({ key, label, statuses }) => {
    const count = statuses.reduce((sum, status) => sum + (counts.get(status) ?? 0), 0);
    return {
      key,
      label,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0
    };
  }).filter((row) => row.count > 0);
}

function computeOrderAnalytics(orders: Order[]): OrderAnalyticsSnapshot {
  const pipeline = computePipelineStages(orders);
  const distribution = pipeline;
  const flowStages = pipeline.filter(
    (row) => row.key !== "cancelled" && row.count > 0
  );

  const deliveredCount = pipeline.find((row) => row.key === "delivered")?.count ?? 0;
  const cancelledCount = pipeline.find((row) => row.key === "cancelled")?.count ?? 0;
  const totalOrders = orders.length;
  const nonCancelled = totalOrders - cancelledCount;

  const processingDurations: number[] = [];
  const shippingDurations: number[] = [];
  const deliveryDurations: number[] = [];

  for (const order of orders) {
    const processingHours = hoursBetween(order.created_at, order.confirmed_at);
    if (processingHours !== null) processingDurations.push(processingHours);

    const shippingHours = hoursBetween(order.confirmed_at, order.shipping_date);
    if (shippingHours !== null) shippingDurations.push(shippingHours);

    const deliveredAt = order.delivery_confirmed_at ?? order.otp_verified_at;
    const deliveryHours = hoursBetween(order.shipping_date, deliveredAt);
    if (deliveryHours !== null) deliveryDurations.push(deliveryHours);
  }

  const dayCounts = new Map<string, number>();
  const hourCounts = new Map<number, number>();

  for (const order of orders) {
    const key = dayKey(order.created_at);
    dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);

    const hour = new Date(order.created_at).getHours();
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
  }

  const topDayEntry =
    dayCounts.size > 0
      ? [...dayCounts.entries()].sort((a, b) => b[1] - a[1])[0]
      : null;

  const peakHourEntry =
    hourCounts.size > 0
      ? [...hourCounts.entries()].sort((a, b) => b[1] - a[1])[0]
      : null;

  const avgProcessing = averageHours(processingDurations);
  const avgShipping = averageHours(shippingDurations);
  const avgDelivery = averageHours(deliveryDurations);

  return {
    pipeline,
    distribution,
    flowStages,
    completionRate: {
      numerator: deliveredCount,
      denominator: nonCancelled,
      percent: nonCancelled > 0 ? Math.round((deliveredCount / nonCancelled) * 100) : null
    },
    cancellationRate: {
      numerator: cancelledCount,
      denominator: totalOrders,
      percent: totalOrders > 0 ? Math.round((cancelledCount / totalOrders) * 100) : null
    },
    avgProcessingTime:
      avgProcessing !== null
        ? {
            label: "Order created → Confirmed",
            averageHours: avgProcessing,
            sampleSize: processingDurations.length
          }
        : null,
    avgShippingTime:
      avgShipping !== null
        ? {
            label: "Confirmed → Shipped",
            averageHours: avgShipping,
            sampleSize: shippingDurations.length
          }
        : null,
    avgDeliveryTime:
      avgDelivery !== null
        ? {
            label: "Shipped → Delivered",
            averageHours: avgDelivery,
            sampleSize: deliveryDurations.length
          }
        : null,
    topOrderDay: topDayEntry
      ? { label: formatDayHighlightLabel(topDayEntry[0]), count: topDayEntry[1] }
      : null,
    peakOrderHour: peakHourEntry
      ? { label: formatHourRange(peakHourEntry[0]), count: peakHourEntry[1] }
      : null
  };
}

function toProductAnalyticsRows(
  sales: Map<string, ProductSalesAccumulator>,
  totalRevenue: number
): ProductAnalyticsRow[] {
  return [...sales.entries()].map((entry) => toProductAnalyticsRow(entry, totalRevenue));
}

type ProductSalesAccumulator = {
  name: string;
  image?: string;
  quantitySold: number;
  revenue: number;
  orderIds: Set<string>;
};

function aggregateProductSales(orders: Order[]): Map<string, ProductSalesAccumulator> {
  const map = new Map<string, ProductSalesAccumulator>();

  for (const order of orders) {
    if (REVENUE_EXCLUDED.has(order.status)) continue;
    for (const item of normalizeOrderItems(order.items)) {
      const key = item.productId || item.name;
      const existing = map.get(key) ?? {
        name: item.name,
        image: item.image,
        quantitySold: 0,
        revenue: 0,
        orderIds: new Set<string>()
      };
      existing.quantitySold += item.quantity;
      existing.revenue += item.subtotal;
      if (!existing.image && item.image) existing.image = item.image;
      existing.orderIds.add(order.id);
      map.set(key, existing);
    }
  }

  return map;
}

function toProductAnalyticsRow(
  [productId, data]: [string, ProductSalesAccumulator],
  totalRevenue: number
): ProductAnalyticsRow {
  return {
    productId,
    name: data.name,
    image: data.image,
    quantitySold: data.quantitySold,
    revenue: data.revenue,
    orderCount: data.orderIds.size,
    revenueSharePercent:
      totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 100) : null
  };
}

function collectHistoricalProductIds(orders: Order[]): Set<string> {
  const ids = new Set<string>();
  for (const order of orders) {
    if (REVENUE_EXCLUDED.has(order.status)) continue;
    for (const item of normalizeOrderItems(order.items)) {
      if (item.productId) ids.add(item.productId);
    }
  }
  return ids;
}

function computeProductAnalytics(
  allOrders: Order[],
  filteredOrders: Order[],
  products: AnalyticsProductInput[],
  productCategories: ProductCategoryLookup
): ProductAnalyticsSnapshot {
  const periodSales = aggregateProductSales(filteredOrders);
  const totalPeriodRevenue = sumRevenue(filteredOrders);

  const periodRows = toProductAnalyticsRows(periodSales, totalPeriodRevenue).sort(
    (a, b) => b.revenue - a.revenue
  );

  const topSellingProducts = periodRows.slice(0, 8);
  const mostOrderedProducts = [...periodRows].sort((a, b) => b.quantitySold - a.quantitySold);
  const revenueContribution = periodRows.filter((row) => row.revenue > 0).slice(0, 8);
  const top10ByRevenue = periodRows.slice(0, 10);
  const bestProduct = periodRows[0] ?? null;

  const historicalProductIds = collectHistoricalProductIds(allOrders);
  const slowMovingProducts =
    historicalProductIds.size >= 2
      ? [...historicalProductIds]
          .map((productId) => {
            const period = periodSales.get(productId);
            return {
              productId,
              name: period?.name ?? products.find((p) => p.id === productId)?.name ?? productId,
              image:
                period?.image ??
                products.find((p) => p.id === productId)?.images?.[0],
              quantitySold: period?.quantitySold ?? 0,
              revenue: period?.revenue ?? 0,
              orderCount: period?.orderIds.size ?? 0,
              revenueSharePercent:
                totalPeriodRevenue > 0
                  ? Math.round(((period?.revenue ?? 0) / totalPeriodRevenue) * 100)
                  : null
            } satisfies ProductAnalyticsRow;
          })
          .sort((a, b) => {
            if (a.revenue !== b.revenue) return a.revenue - b.revenue;
            if (a.quantitySold !== b.quantitySold) return a.quantitySold - b.quantitySold;
            return a.orderCount - b.orderCount;
          })
          .slice(0, 5)
      : [];

  const categoryPerformance = computeCategoryPerformance(filteredOrders, productCategories);
  const categoryTotalRevenue = categoryPerformance.reduce((sum, row) => sum + row.revenue, 0);
  const categoryDistribution = categoryPerformance
    .map((row) => ({
      categoryId: row.categoryId,
      name: row.name,
      revenue: row.revenue,
      percentage:
        categoryTotalRevenue > 0
          ? Math.round((row.revenue / categoryTotalRevenue) * 100)
          : 0
    }))
    .filter((row) => row.revenue > 0);

  const activeProductsCount = products.filter((product) => product.status === "active").length;

  const neverSoldProducts = products
    .filter((product) => !historicalProductIds.has(product.id))
    .map((product) => ({
      productId: product.id,
      name: product.name,
      image: product.images[0],
      categoryName: product.category_name
    }));

  return {
    topSellingProducts,
    mostOrderedProducts,
    slowMovingProducts,
    revenueContribution,
    top10ByRevenue,
    categoryPerformance,
    categoryDistribution,
    activeProductsCount,
    neverSoldProducts,
    bestProduct
  };
}

export type ProductCategoryLookup = Map<
  string,
  { categoryId: string; categoryName: string }
>;

function computeCategoryPerformance(
  orders: Order[],
  productCategories: ProductCategoryLookup
): CategoryPerformanceRow[] {
  if (productCategories.size === 0) return [];

  const map = new Map<string, { name: string; revenue: number; orderIds: Set<string>; unitsSold: number }>();

  for (const order of orders) {
    if (REVENUE_EXCLUDED.has(order.status)) continue;
    const categoriesInOrder = new Set<string>();

    for (const item of normalizeOrderItems(order.items)) {
      if (!item.productId) continue;
      const meta = productCategories.get(item.productId);
      if (!meta) continue;

      const existing = map.get(meta.categoryId) ?? {
        name: meta.categoryName,
        revenue: 0,
        orderIds: new Set<string>(),
        unitsSold: 0
      };
      existing.revenue += item.subtotal;
      existing.unitsSold += item.quantity;
      map.set(meta.categoryId, existing);
      categoriesInOrder.add(meta.categoryId);
    }

    for (const categoryId of categoriesInOrder) {
      map.get(categoryId)?.orderIds.add(order.id);
    }
  }

  return Array.from(map.entries())
    .map(([categoryId, data]) => ({
      categoryId,
      name: data.name,
      revenue: data.revenue,
      orders: data.orderIds.size,
      unitsSold: data.unitsSold
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

export function computeStoreAnalytics(
  orders: Order[],
  filter: StoreAnalyticsFilter,
  products: AnalyticsProductInput[]
): StoreAnalyticsSnapshot {
  const productCategories = buildProductCategoryLookup(products);
  const filtered = filterOrdersByStoreRange(orders, filter);

  return {
    overview: computeOverview(filtered),
    dailyTrend: buildSalesTrend(filtered, dayKey, formatDayLabel, 30),
    weeklyTrend: buildSalesTrend(filtered, weekKey, formatWeekLabel, 12),
    monthlyTrend: buildSalesTrend(filtered, monthKey, formatMonthLabel, 12),
    salesAnalytics: computeSalesAnalytics(orders),
    orderAnalytics: computeOrderAnalytics(filtered),
    productAnalytics: computeProductAnalytics(orders, filtered, products, productCategories)
  };
}

export function buildProductCategoryLookup(
  products: AnalyticsProductInput[]
): ProductCategoryLookup {
  const lookup: ProductCategoryLookup = new Map();

  for (const product of products) {
    if (!product.category_id || !product.category_name) continue;
    lookup.set(product.id, {
      categoryId: product.category_id,
      categoryName: product.category_name
    });
  }

  return lookup;
}
