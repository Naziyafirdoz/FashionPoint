import { getInventoryStatus } from "@/lib/admin/inventory";
import type {
  AIGrowthDateFilter,
  AIGrowthInsightTone
} from "@/components/admin/ai-growth/ai-growth-shared";
import { computeConversionIntelligence } from "@/lib/ai-growth/conversion-intelligence";
import { computeCustomerIntelligence } from "@/lib/ai-growth/customer-intelligence";
import {
  computeProductIntelligence,
  type ProductCatalogInput
} from "@/lib/ai-growth/product-intelligence";
import { computeRevenueIntelligence } from "@/lib/ai-growth/revenue-intelligence";
import type { Order } from "@/types";

const TOP_PRODUCT_CONCENTRATION_WARNING_PERCENT = 40;
const TOP_THREE_CONCENTRATION_WARNING_PERCENT = 80;
const CANCELLATION_CRITICAL_PERCENT = 10;
const PAYMENT_SUCCESS_HEALTHY_PERCENT = 90;
const REPEAT_PURCHASE_HEALTHY_PERCENT = 25;
const INVENTORY_DISPLAY_LIMIT = 3;

export const AI_SUGGESTION_GROUP_LABELS = {
  critical: "Critical Attention",
  warning: "Warning",
  healthy: "Healthy Metrics",
  information: "Information"
} as const;

export type AISuggestionPriority = keyof typeof AI_SUGGESTION_GROUP_LABELS;

export type AISuggestion = {
  id: string;
  text: string;
  detail?: string;
  tone?: AIGrowthInsightTone;
};

export type AISuggestionGroup = {
  priority: AISuggestionPriority;
  title: string;
  tone: AIGrowthInsightTone;
  suggestions: AISuggestion[];
};

const GROUP_TONES: Record<AISuggestionPriority, AIGrowthInsightTone> = {
  critical: "warning",
  warning: "warning",
  healthy: "success",
  information: "info"
};

function formatCurrency(value: number): string {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function statusCount(
  rows: { key: string; count: number }[],
  key: string
): number {
  return rows.find((row) => row.key === key)?.count ?? 0;
}

type InventoryRiskRow = {
  name: string;
  stock: number;
  unitsSold: number;
};

function collectInventoryRiskProducts(
  productIntel: ReturnType<typeof computeProductIntelligence>,
  products: ProductCatalogInput[]
): InventoryRiskRow[] {
  const soldByProductId = new Map(
    productIntel.periodSalesProducts.map((row) => [row.productId, row.unitsSold])
  );
  const risks: InventoryRiskRow[] = [];

  for (const product of products) {
    if (product.status !== "active") continue;

    const unitsSold = soldByProductId.get(product.id) ?? 0;
    if (unitsSold <= 0) continue;

    const stock = product.totalStock;
    if (stock > 0 && getInventoryStatus(stock) === "in_stock") continue;

    risks.push({
      name: product.name,
      stock,
      unitsSold
    });
  }

  return risks.sort((a, b) => a.stock - b.stock);
}

function buildInventoryDetail(rows: InventoryRiskRow[]): string {
  const shown = rows.slice(0, INVENTORY_DISPLAY_LIMIT);
  const remaining = rows.length - shown.length;
  let detail = shown.map((row) => `${row.name} (${row.stock})`).join(" · ");

  if (remaining > 0) {
    detail += ` +${remaining} more`;
  }

  return detail;
}

function buildInventorySuggestions(risks: InventoryRiskRow[]): AISuggestion[] {
  const outOfStock = risks.filter((row) => row.stock === 0);
  const lowStock = risks.filter((row) => row.stock > 0);
  const suggestions: AISuggestion[] = [];

  if (outOfStock.length > 0) {
    suggestions.push({
      id: "inventory-out-of-stock",
      text: "Out of stock",
      detail: buildInventoryDetail(outOfStock),
      tone: "critical"
    });
  }

  if (lowStock.length > 0) {
    suggestions.push({
      id: "inventory-low-stock",
      text: "Low stock",
      detail: buildInventoryDetail(lowStock),
      tone: "warning"
    });
  }

  return suggestions;
}

function formatAverageDailyRevenueDetail(insightText: string): string | undefined {
  const match = insightText.match(
    /^Average daily revenue (₹[\d,]+) across (\d+ \w+) \(period total (₹[\d,]+)\)\.$/
  );

  if (!match) return undefined;

  return `${match[1]}/day · ${match[2]} · total ${match[3]}`;
}

function formatAverageOrdersDetail(insightText: string): string | undefined {
  const match = insightText.match(/^Average orders per day: ([\d.]+)\.$/);
  return match ? `${match[1]} orders/day` : undefined;
}

function buildGroup(
  priority: AISuggestionPriority,
  suggestions: AISuggestion[]
): AISuggestionGroup | null {
  if (suggestions.length === 0) return null;

  return {
    priority,
    title: AI_SUGGESTION_GROUP_LABELS[priority],
    tone: GROUP_TONES[priority],
    suggestions
  };
}

export function computeAISuggestions(
  orders: Order[],
  ordersWithItems: Order[],
  products: ProductCatalogInput[],
  filter: AIGrowthDateFilter
): AISuggestionGroup[] {
  const customer = computeCustomerIntelligence(orders, filter);
  const revenue = computeRevenueIntelligence(orders, filter);
  const conversion = computeConversionIntelligence(orders, filter);
  const product =
    ordersWithItems.length > 0 && products.length > 0
      ? computeProductIntelligence(ordersWithItems, products, filter)
      : null;

  const topCustomer = customer.topCustomers[0] ?? null;

  const critical: AISuggestion[] = [];
  const warning: AISuggestion[] = [];
  const healthy: AISuggestion[] = [];
  const information: AISuggestion[] = [];

  if (product?.hasOrderLineItems) {
    critical.push(...buildInventorySuggestions(collectInventoryRiskProducts(product, products)));
  }

  if (
    conversion.cancelledOrders > 0 &&
    conversion.cancellationPercent !== null &&
    conversion.cancellationPercent >= CANCELLATION_CRITICAL_PERCENT
  ) {
    critical.push({
      id: "cancellation-rate",
      text: "Cancelled orders",
      detail: `${conversion.cancelledOrders} (${conversion.cancellationPercent}%)`
    });
  }

  if (product && product.periodProductRevenue > 0) {
    const topThree = product.topProducts.slice(0, 3);
    const topThreeRevenue = topThree.reduce((sum, row) => sum + row.revenue, 0);
    const topThreePercent = Math.round((topThreeRevenue / product.periodProductRevenue) * 100);

    if (topThreePercent >= TOP_THREE_CONCENTRATION_WARNING_PERCENT) {
      warning.push({
        id: "top-three-concentration",
        text: "Top 3 products",
        detail: `${topThreePercent}% of total revenue`
      });
    }
  }

  if (
    product &&
    product.periodProductRevenue > 0 &&
    product.topProductRevenue > 0
  ) {
    const topProductPercent = Math.round(
      (product.topProductRevenue / product.periodProductRevenue) * 100
    );

    if (topProductPercent >= TOP_PRODUCT_CONCENTRATION_WARNING_PERCENT) {
      warning.push({
        id: "top-product-concentration",
        text: "Top product",
        detail: `${topProductPercent}% of total revenue`
      });
    }
  }

  const processingOrders = statusCount(conversion.orderStatusDistribution, "processing");
  const deliveredOrders = statusCount(conversion.orderStatusDistribution, "delivered");

  if (processingOrders > deliveredOrders) {
    warning.push({
      id: "fulfillment-pipeline",
      text: "Fulfillment pipeline",
      detail: `Processing: ${processingOrders} · Delivered: ${deliveredOrders}`
    });
  }

  if (
    conversion.orderSuccessRate !== null &&
    conversion.orderSuccessRate >= PAYMENT_SUCCESS_HEALTHY_PERCENT
  ) {
    healthy.push({
      id: "payment-success-rate",
      text: "Payment success rate",
      detail: `${conversion.orderSuccessRate}%`
    });
  }

  if (
    customer.repeatPurchaseRate !== null &&
    customer.repeatPurchaseRate >= REPEAT_PURCHASE_HEALTHY_PERCENT
  ) {
    healthy.push({
      id: "repeat-purchase-rate",
      text: "Repeat purchase rate",
      detail: `${customer.repeatPurchaseRate}%`
    });
  }

  if (revenue.highestRevenueDay && revenue.highestRevenueDay.revenue > 0) {
    information.push({
      id: "highest-revenue-day",
      text: "Highest revenue day",
      detail: formatCurrency(revenue.highestRevenueDay.revenue)
    });
  }

  if (customer.totalCustomers >= 2 && topCustomer && topCustomer.revenue > 0) {
    information.push({
      id: "top-customer",
      text: "Top customer",
      detail: `${formatCurrency(topCustomer.revenue)} · ${topCustomer.orderCount} ${topCustomer.orderCount === 1 ? "order" : "orders"}`
    });
  }

  const averageDailyRevenueInsight = revenue.revenueInsights.find(
    (insight) => insight.id === "average-daily-revenue"
  );
  if (averageDailyRevenueInsight) {
    const detail = formatAverageDailyRevenueDetail(averageDailyRevenueInsight.text);
    information.push(
      detail
        ? {
            id: "average-daily-revenue",
            text: "Average daily revenue",
            detail
          }
        : {
            id: "average-daily-revenue",
            text: averageDailyRevenueInsight.text
          }
    );
  }

  const averageOrdersInsight = conversion.conversionInsights.find(
    (insight) => insight.id === "average-orders-per-day"
  );
  if (averageOrdersInsight) {
    const detail = formatAverageOrdersDetail(averageOrdersInsight.text);
    information.push(
      detail
        ? {
            id: "average-orders-per-day",
            text: "Average orders per day",
            detail
          }
        : {
            id: "average-orders-per-day",
            text: averageOrdersInsight.text
          }
    );
  }

  return (
    [
      buildGroup("critical", critical),
      buildGroup("warning", warning),
      buildGroup("healthy", healthy),
      buildGroup("information", information)
    ] as const
  ).filter((group): group is AISuggestionGroup => group !== null);
}
