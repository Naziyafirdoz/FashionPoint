import { filterOrdersByStoreRange } from "@/lib/admin/store-analytics";
import { normalizeOrderItems } from "@/lib/orders/order-items";
import type { AIGrowthDateFilter } from "@/components/admin/ai-growth/ai-growth-shared";
import type { Order, OrderStatus } from "@/types";

const REVENUE_EXCLUDED: Set<OrderStatus> = new Set(["cancelled", "returned"]);

export type ProductCatalogInput = {
  id: string;
  name: string;
  images: string[];
  status: string;
  price: number;
  totalStock: number;
};

export type ProductSalesRow = {
  productId: string;
  name: string;
  image?: string;
  unitsSold: number;
  revenue: number;
};

export type SlowMovingProductRow = {
  productId: string;
  name: string;
  image?: string;
  stock: number;
  price: number;
};

export type ProductInsight = {
  id: string;
  tone: "success" | "warning" | "info";
  text: string;
};

export type ProductIntelligenceSnapshot = {
  activeProducts: number;
  productsSold: number;
  topProductRevenue: number;
  periodProductRevenue: number;
  averageRevenuePerProduct: number | null;
  topProducts: ProductSalesRow[];
  revenueDistribution: { name: string; revenue: number }[];
  slowMovingProducts: SlowMovingProductRow[];
  bestSellers: ProductSalesRow[];
  lifetimeTopProducts: ProductSalesRow[];
  periodSalesProducts: ProductSalesRow[];
  productInsights: ProductInsight[];
  hasOrderLineItems: boolean;
  hasPeriodProductSales: boolean;
};

type ProductSalesAccumulator = {
  name: string;
  image?: string;
  unitsSold: number;
  revenue: number;
};

function formatCurrencyForInsight(value: number): string {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function ordersHaveLineItems(orders: Order[]): boolean {
  return orders.some((order) => normalizeOrderItems(order.items).length > 0);
}

function aggregateProductSales(orders: Order[]): Map<string, ProductSalesAccumulator> {
  const map = new Map<string, ProductSalesAccumulator>();

  for (const order of orders) {
    if (REVENUE_EXCLUDED.has(order.status)) continue;

    for (const item of normalizeOrderItems(order.items)) {
      const productId = item.productId || item.name;
      const existing = map.get(productId) ?? {
        name: item.name,
        image: item.image,
        unitsSold: 0,
        revenue: 0
      };

      existing.unitsSold += item.quantity;
      existing.revenue += item.subtotal;
      if (!existing.image && item.image) existing.image = item.image;
      map.set(productId, existing);
    }
  }

  return map;
}

function toProductSalesRows(sales: Map<string, ProductSalesAccumulator>): ProductSalesRow[] {
  return [...sales.entries()].map(([productId, data]) => ({
    productId,
    name: data.name,
    image: data.image,
    unitsSold: data.unitsSold,
    revenue: data.revenue
  }));
}

function sortByRevenueDesc(rows: ProductSalesRow[]): ProductSalesRow[] {
  return [...rows].sort((a, b) => {
    if (b.revenue !== a.revenue) return b.revenue - a.revenue;
    return b.unitsSold - a.unitsSold;
  });
}

function sortByUnitsDesc(rows: ProductSalesRow[]): ProductSalesRow[] {
  return [...rows].sort((a, b) => {
    if (b.unitsSold !== a.unitsSold) return b.unitsSold - a.unitsSold;
    return b.revenue - a.revenue;
  });
}

function sumPeriodRevenue(rows: ProductSalesRow[]): number {
  return rows.reduce((sum, row) => sum + row.revenue, 0);
}

function buildSlowMovingProducts(
  products: ProductCatalogInput[],
  periodSales: Map<string, ProductSalesAccumulator>
): SlowMovingProductRow[] {
  return products
    .filter((product) => product.totalStock > 0)
    .filter((product) => {
      const sold = periodSales.get(product.id);
      return !sold || sold.unitsSold === 0;
    })
    .map((product) => ({
      productId: product.id,
      name: product.name,
      image: product.images[0],
      stock: product.totalStock,
      price: product.price
    }))
    .sort((a, b) => b.stock - a.stock);
}

function buildProductInsights(input: {
  topProduct: ProductSalesRow | null;
  productsSold: number;
  periodRevenue: number;
  periodRows: ProductSalesRow[];
}): ProductInsight[] {
  const insights: ProductInsight[] = [];

  if (input.productsSold > 0) {
    insights.push({
      id: "products-sold-count",
      tone: "info",
      text: `Products sold in selected period: ${input.productsSold}.`
    });
  }

  if (input.topProduct && input.topProduct.revenue > 0) {
    insights.push({
      id: "top-product",
      tone: "info",
      text: `Top product ${input.topProduct.name} generated ${formatCurrencyForInsight(input.topProduct.revenue)} from ${input.topProduct.unitsSold} ${input.topProduct.unitsSold === 1 ? "unit" : "units"}.`
    });
  }

  if (input.productsSold > 0 && input.periodRevenue > 0) {
    const averageRevenuePerProduct = input.periodRevenue / input.productsSold;
    insights.push({
      id: "average-revenue-per-product",
      tone: "info",
      text: `Average revenue per product ${formatCurrencyForInsight(averageRevenuePerProduct)}.`
    });
  }

  if (input.periodRevenue > 0 && input.periodRows.length > 0) {
    const topThree = sortByRevenueDesc(input.periodRows).slice(0, 3);
    const topThreeRevenue = topThree.reduce((sum, row) => sum + row.revenue, 0);
    const contributionPercent = Math.round((topThreeRevenue / input.periodRevenue) * 100);

    if (topThreeRevenue > 0) {
      insights.push({
        id: "top-three-contribution",
        tone: "info",
        text: `Top ${topThree.length} product${topThree.length === 1 ? "" : "s"} contributed ${contributionPercent}% of total revenue.`
      });
    }
  }

  if (
    input.topProduct &&
    input.topProduct.revenue > 0 &&
    input.productsSold >= 2 &&
    input.periodRevenue > 0
  ) {
    const averageRevenuePerProduct = input.periodRevenue / input.productsSold;
    if (averageRevenuePerProduct > 0) {
      const multiple = input.topProduct.revenue / averageRevenuePerProduct;
      insights.push({
        id: "top-vs-average",
        tone: multiple >= 2 ? "warning" : "info",
        text: `Highest product revenue ${formatCurrencyForInsight(input.topProduct.revenue)} versus average ${formatCurrencyForInsight(averageRevenuePerProduct)} (${multiple.toFixed(1)}×).`
      });
    }
  }

  return insights;
}

export function computeProductIntelligence(
  orders: Order[],
  products: ProductCatalogInput[],
  filter: AIGrowthDateFilter
): ProductIntelligenceSnapshot {
  const hasOrderLineItems = ordersHaveLineItems(orders);
  const periodOrders = filterOrdersByStoreRange(orders, filter);
  const periodSales = aggregateProductSales(periodOrders);
  const lifetimeSales = aggregateProductSales(orders);

  const periodRows = sortByRevenueDesc(toProductSalesRows(periodSales).filter((row) => row.revenue > 0));
  const lifetimeRows = sortByRevenueDesc(
    toProductSalesRows(lifetimeSales).filter((row) => row.revenue > 0)
  );

  const productsSold = periodRows.length;
  const periodRevenue = sumPeriodRevenue(periodRows);
  const topProduct = periodRows[0] ?? null;
  const activeProducts = products.filter((product) => product.status === "active").length;

  const averageRevenuePerProduct =
    productsSold > 0 && periodRevenue > 0 ? periodRevenue / productsSold : null;

  const topProducts = periodRows.slice(0, 10);
  const revenueDistribution = topProducts.map((row) => ({
    name: row.name.length > 22 ? `${row.name.slice(0, 20)}…` : row.name,
    revenue: row.revenue
  }));
  const bestSellers = sortByUnitsDesc(periodRows).slice(0, 10);
  const lifetimeTopProducts = lifetimeRows.slice(0, 10);
  const slowMovingProducts = buildSlowMovingProducts(products, periodSales);

  const productInsights = buildProductInsights({
    topProduct,
    productsSold,
    periodRevenue,
    periodRows
  });

  return {
    activeProducts,
    productsSold,
    topProductRevenue: topProduct?.revenue ?? 0,
    periodProductRevenue: periodRevenue,
    averageRevenuePerProduct,
    topProducts,
    revenueDistribution,
    slowMovingProducts,
    bestSellers,
    lifetimeTopProducts,
    periodSalesProducts: periodRows,
    productInsights,
    hasOrderLineItems,
    hasPeriodProductSales: productsSold > 0
  };
}
