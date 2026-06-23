import type { Order, OrderStatus } from "@/types";
import { getInventoryStatus, type InventoryStatus } from "@/lib/admin/inventory";
import { normalizeOrderItems } from "@/lib/orders/order-items";

const REVENUE_EXCLUDED: Set<OrderStatus> = new Set(["cancelled", "returned"]);

const STOCK_HEALTH_LABELS: Record<InventoryStatus, string> = {
  in_stock: "Healthy Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out Of Stock"
};

const FAST_MOVING_LIMIT = 8;
const SLOW_MOVING_LIMIT = 5;

export type InventoryProductInput = {
  id: string;
  name: string;
  images: string[];
  status: string;
  price: number;
  category_id: string | null;
  category_name: string | null;
  total_stock: number;
};

export type StockHealthBucket = {
  key: InventoryStatus;
  label: string;
  count: number;
  percentage: number;
};

export type InventoryProductRow = {
  productId: string;
  name: string;
  image?: string;
  categoryName: string | null;
  stock: number;
  inventoryValue: number;
};

export type RestockPriority = "critical" | "low" | "healthy";

export type RestockPriorityRow = InventoryProductRow & {
  priority: RestockPriority;
  priorityLabel: string;
};

export type CategoryInventoryRow = {
  categoryId: string;
  name: string;
  productCount: number;
  unitsAvailable: number;
  inventoryValue: number;
};

export type MovingProductRow = {
  productId: string;
  name: string;
  image?: string;
  unitsSold: number;
  currentStock: number;
};

export type InventoryValueHighlight = {
  productId: string;
  name: string;
  image?: string;
  inventoryValue: number;
  stock: number;
};

export type InventoryOverview = {
  totalProducts: number;
  activeProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalInventoryValue: number;
};

export type InventoryAnalyticsSnapshot = {
  overview: InventoryOverview;
  stockHealth: StockHealthBucket[];
  stockDistribution: StockHealthBucket[];
  lowStockProducts: InventoryProductRow[];
  outOfStockProducts: InventoryProductRow[];
  inventoryValue: {
    total: number;
    highest: InventoryValueHighlight | null;
    lowest: InventoryValueHighlight | null;
  };
  categoryInventory: CategoryInventoryRow[];
  fastMovingProducts: MovingProductRow[];
  slowMovingProducts: MovingProductRow[];
  restockPriority: RestockPriorityRow[];
};

export function getRestockPriority(stock: number): RestockPriority {
  if (stock > 5) return "healthy";
  if (stock >= 3) return "low";
  return "critical";
}

const RESTOCK_PRIORITY_LABELS: Record<RestockPriority, string> = {
  critical: "Critical",
  low: "Low Stock",
  healthy: "Healthy"
};

function isCatalogProduct(product: InventoryProductInput) {
  return product.status !== "archived";
}

function isActiveProduct(product: InventoryProductInput) {
  return product.status === "active";
}

function productInventoryValue(product: InventoryProductInput) {
  return product.price * product.total_stock;
}

function toProductRow(product: InventoryProductInput): InventoryProductRow {
  return {
    productId: product.id,
    name: product.name,
    image: product.images[0],
    categoryName: product.category_name,
    stock: product.total_stock,
    inventoryValue: productInventoryValue(product)
  };
}

function aggregateUnitsSold(orders: Order[]): Map<string, number> {
  const map = new Map<string, number>();

  for (const order of orders) {
    if (REVENUE_EXCLUDED.has(order.status)) continue;
    for (const item of normalizeOrderItems(order.items)) {
      if (!item.productId) continue;
      map.set(item.productId, (map.get(item.productId) ?? 0) + item.quantity);
    }
  }

  return map;
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

function buildStockHealth(products: InventoryProductInput[]): StockHealthBucket[] {
  const catalog = products.filter(isCatalogProduct);
  const counts: Record<InventoryStatus, number> = {
    in_stock: 0,
    low_stock: 0,
    out_of_stock: 0
  };

  for (const product of catalog) {
    counts[getInventoryStatus(product.total_stock)]++;
  }

  const total = catalog.length;

  return (["in_stock", "low_stock", "out_of_stock"] as const)
    .map((key) => ({
      key,
      label: STOCK_HEALTH_LABELS[key],
      count: counts[key],
      percentage: total > 0 ? Math.round((counts[key] / total) * 100) : 0
    }))
    .filter((row) => row.count > 0);
}

export function computeInventoryAnalytics(
  products: InventoryProductInput[],
  orders: Order[]
): InventoryAnalyticsSnapshot {
  const catalog = products.filter(isCatalogProduct);
  const activeProducts = catalog.filter(isActiveProduct);
  const unitsSold = aggregateUnitsSold(orders);
  const historicalProductIds = collectHistoricalProductIds(orders);
  const productById = new Map(catalog.map((product) => [product.id, product]));

  const overview: InventoryOverview = {
    totalProducts: catalog.length,
    activeProducts: activeProducts.length,
    lowStockProducts: catalog.filter((p) => getInventoryStatus(p.total_stock) === "low_stock")
      .length,
    outOfStockProducts: catalog.filter((p) => getInventoryStatus(p.total_stock) === "out_of_stock")
      .length,
    totalInventoryValue: activeProducts.reduce((sum, p) => sum + productInventoryValue(p), 0)
  };

  const stockHealth = buildStockHealth(products);
  const stockDistribution = stockHealth;

  const lowStockProducts = catalog
    .filter((p) => getInventoryStatus(p.total_stock) === "low_stock")
    .map(toProductRow)
    .sort((a, b) => a.stock - b.stock);

  const outOfStockProducts = catalog
    .filter((p) => getInventoryStatus(p.total_stock) === "out_of_stock")
    .map(toProductRow)
    .sort((a, b) => a.name.localeCompare(b.name));

  const activeWithValue = activeProducts
    .map((product) => ({
      productId: product.id,
      name: product.name,
      image: product.images[0],
      inventoryValue: productInventoryValue(product),
      stock: product.total_stock
    }))
    .filter((row) => row.inventoryValue > 0);

  const inventoryValue = {
    total: overview.totalInventoryValue,
    highest:
      activeWithValue.length > 0
        ? [...activeWithValue].sort((a, b) => b.inventoryValue - a.inventoryValue)[0]
        : null,
    lowest:
      activeWithValue.length > 0
        ? [...activeWithValue].sort((a, b) => a.inventoryValue - b.inventoryValue)[0]
        : null
  };

  const categoryMap = new Map<
    string,
    { name: string; productCount: number; unitsAvailable: number; inventoryValue: number }
  >();

  for (const product of activeProducts) {
    if (!product.category_id || !product.category_name) continue;
    const existing = categoryMap.get(product.category_id) ?? {
      name: product.category_name,
      productCount: 0,
      unitsAvailable: 0,
      inventoryValue: 0
    };
    existing.productCount += 1;
    existing.unitsAvailable += product.total_stock;
    existing.inventoryValue += productInventoryValue(product);
    categoryMap.set(product.category_id, existing);
  }

  const categoryInventory = [...categoryMap.entries()]
    .map(([categoryId, data]) => ({
      categoryId,
      name: data.name,
      productCount: data.productCount,
      unitsAvailable: data.unitsAvailable,
      inventoryValue: data.inventoryValue
    }))
    .sort((a, b) => b.inventoryValue - a.inventoryValue);

  const fastMovingProducts =
    unitsSold.size > 0
      ? [...unitsSold.entries()]
          .map(([productId, unitsSoldCount]) => {
            const product = productById.get(productId);
            return {
              productId,
              name: product?.name ?? productId,
              image: product?.images[0],
              unitsSold: unitsSoldCount,
              currentStock: product?.total_stock ?? 0
            };
          })
          .sort((a, b) => b.unitsSold - a.unitsSold)
          .slice(0, FAST_MOVING_LIMIT)
      : [];

  const slowMovingProducts =
    historicalProductIds.size >= 2
      ? [...historicalProductIds]
          .filter((productId) => {
            const product = productById.get(productId);
            return product && product.total_stock > 0;
          })
          .map((productId) => {
            const product = productById.get(productId)!;
            return {
              productId,
              name: product.name,
              image: product.images[0],
              unitsSold: unitsSold.get(productId) ?? 0,
              currentStock: product.total_stock
            };
          })
          .sort((a, b) => a.unitsSold - b.unitsSold || b.currentStock - a.currentStock)
          .slice(0, SLOW_MOVING_LIMIT)
      : [];

  const restockPriority = catalog
    .map((product) => {
      const priority = getRestockPriority(product.total_stock);
      return {
        ...toProductRow(product),
        priority,
        priorityLabel: RESTOCK_PRIORITY_LABELS[priority]
      };
    })
    .filter((row) => row.priority !== "healthy")
    .sort((a, b) => {
      const priorityOrder: Record<RestockPriority, number> = {
        critical: 0,
        low: 1,
        healthy: 2
      };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.stock - b.stock;
    });

  return {
    overview,
    stockHealth,
    stockDistribution,
    lowStockProducts,
    outOfStockProducts,
    inventoryValue,
    categoryInventory,
    fastMovingProducts,
    slowMovingProducts,
    restockPriority
  };
}
