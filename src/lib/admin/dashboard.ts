import type { SupabaseClient } from "@supabase/supabase-js";
import { getInventoryStatus, listInventoryVariants } from "@/lib/admin/inventory";
import { normalizeOrderItems } from "@/lib/orders/order-items";
import type { Order } from "@/types";

export type DashboardKpis = {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  lowStockProducts: number;
  totalReviews: number;
};

export type DashboardRecentOrder = {
  id: string;
  orderNumber: string;
  customer: string;
  amount: number;
  status: string;
  date: string;
};

export type DashboardLowStockItem = {
  productId: string;
  productName: string;
  currentStock: number;
  status: "low_stock" | "out_of_stock";
};

export type DashboardTopProduct = {
  productId: string;
  name: string;
  quantitySold: number;
  revenue: number;
};

export type DashboardRevenuePoint = {
  date: string;
  revenue: number;
  orders: number;
};

export type DashboardChannelSale = {
  channel: string;
  revenue: number;
  orders: number;
};

export type DashboardPeriod = "7" | "30" | "90";

export type DashboardData = {
  kpis: DashboardKpis;
  recentOrders: DashboardRecentOrder[];
  lowStock: DashboardLowStockItem[];
  topSelling: DashboardTopProduct[];
  revenueTrend: Record<DashboardPeriod, DashboardRevenuePoint[]>;
  salesByChannel: DashboardChannelSale[] | null;
};

const REVENUE_EXCLUDED_STATUSES = new Set(["cancelled", "returned"]);

/** Lean projection — excludes heavy `items` jsonb from the main orders scan. */
const DASHBOARD_ORDER_LEAN_SELECT =
  "id, order_number, total, status, created_at, shipping_address, guest_email";

const DASHBOARD_ORDER_ITEMS_SELECT = "items, status";

type DashboardOrderLean = Pick<
  Order,
  "id" | "order_number" | "total" | "status" | "created_at" | "shipping_address" | "guest_email"
> & {
  source_channel?: string;
};

function customerName(order: DashboardOrderLean): string {
  const addr = order.shipping_address;
  return addr?.name ?? addr?.line ?? order.guest_email ?? "Guest";
}

function buildRevenueTrend(orders: DashboardOrderLean[], days: number): DashboardRevenuePoint[] {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const byDate = new Map<string, { revenue: number; orders: number }>();

  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    byDate.set(d.toISOString().slice(0, 10), { revenue: 0, orders: 0 });
  }

  for (const order of orders) {
    if (REVENUE_EXCLUDED_STATUSES.has(order.status)) continue;
    const created = new Date(order.created_at);
    if (created < start) continue;
    const key = created.toISOString().slice(0, 10);
    const entry = byDate.get(key);
    if (!entry) continue;
    entry.revenue += Number(order.total) || 0;
    entry.orders += 1;
  }

  return Array.from(byDate.entries()).map(([date, { revenue, orders: orderCount }]) => ({
    date,
    revenue,
    orders: orderCount
  }));
}

function computeTopSelling(
  orderItems: Array<Pick<Order, "items" | "status">>
): DashboardTopProduct[] {
  const map = new Map<string, { name: string; quantitySold: number; revenue: number }>();

  for (const order of orderItems) {
    if (REVENUE_EXCLUDED_STATUSES.has(order.status)) continue;
    for (const item of normalizeOrderItems(order.items)) {
      const key = item.productId || item.name;
      const existing = map.get(key) ?? { name: item.name, quantitySold: 0, revenue: 0 };
      existing.quantitySold += item.quantity;
      existing.revenue += item.subtotal;
      map.set(key, existing);
    }
  }

  return Array.from(map.entries())
    .map(([productId, data]) => ({ productId, ...data }))
    .sort((a, b) => b.quantitySold - a.quantitySold)
    .slice(0, 5);
}

function computeLowStock(
  variants: Awaited<ReturnType<typeof listInventoryVariants>>
): DashboardLowStockItem[] {
  const byProduct = new Map<string, { productId: string; productName: string; currentStock: number }>();

  for (const row of variants) {
    if (row.status === "in_stock") continue;
    const existing = byProduct.get(row.product_id);
    if (!existing) {
      byProduct.set(row.product_id, {
        productId: row.product_id,
        productName: row.product_name,
        currentStock: row.stock_quantity
      });
      continue;
    }
    existing.currentStock += row.stock_quantity;
  }

  return Array.from(byProduct.values())
    .map((item) => {
      const inventoryStatus = getInventoryStatus(item.currentStock);
      if (inventoryStatus === "in_stock") return null;
      return { ...item, status: inventoryStatus };
    })
    .filter((item): item is DashboardLowStockItem => item !== null)
    .sort((a, b) => a.currentStock - b.currentStock)
    .slice(0, 10);
}

function computeSalesByChannel(orders: DashboardOrderLean[]): DashboardChannelSale[] | null {
  const channelField = orders.some((o) => typeof o.source_channel === "string");
  if (!channelField) return null;

  const map = new Map<string, { revenue: number; orders: number }>();
  for (const order of orders) {
    const channel = order.source_channel;
    if (!channel || REVENUE_EXCLUDED_STATUSES.has(order.status)) continue;
    const entry = map.get(channel) ?? { revenue: 0, orders: 0 };
    entry.revenue += Number(order.total) || 0;
    entry.orders += 1;
    map.set(channel, entry);
  }

  if (map.size === 0) return null;

  return Array.from(map.entries())
    .map(([channel, data]) => ({ channel, ...data }))
    .sort((a, b) => b.revenue - a.revenue);
}

export async function getDashboardData(db: SupabaseClient): Promise<DashboardData> {
  const [ordersLeanResult, ordersItemsResult, customersResult, productsResult, reviewsResult, inventoryVariants] =
    await Promise.all([
      db
        .from("orders")
        .select(DASHBOARD_ORDER_LEAN_SELECT)
        .order("created_at", { ascending: false }),
      db.from("orders").select(DASHBOARD_ORDER_ITEMS_SELECT),
      db.from("customers").select("*", { count: "exact", head: true }),
      db.from("products").select("*", { count: "exact", head: true }),
      db.from("reviews").select("*", { count: "exact", head: true }),
      listInventoryVariants(db)
    ]);

  const ordersLean = (ordersLeanResult.data ?? []) as DashboardOrderLean[];
  const orderItems = (ordersItemsResult.data ?? []) as Array<Pick<Order, "items" | "status">>;
  const lowStock = computeLowStock(inventoryVariants);

  const kpis: DashboardKpis = {
    totalRevenue: ordersLean
      .filter((o) => !REVENUE_EXCLUDED_STATUSES.has(o.status))
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0),
    totalOrders: ordersLeanResult.error ? 0 : ordersLean.length,
    totalCustomers: customersResult.error ? 0 : (customersResult.count ?? 0),
    totalProducts: productsResult.error ? 0 : (productsResult.count ?? 0),
    lowStockProducts: lowStock.length,
    totalReviews: reviewsResult.error ? 0 : (reviewsResult.count ?? 0)
  };

  const recentOrders: DashboardRecentOrder[] = ordersLean.slice(0, 10).map((o) => ({
    id: o.id,
    orderNumber: o.order_number,
    customer: customerName(o),
    amount: Number(o.total) || 0,
    status: o.status,
    date: o.created_at
  }));

  return {
    kpis,
    recentOrders,
    lowStock,
    topSelling: computeTopSelling(orderItems),
    revenueTrend: {
      "7": buildRevenueTrend(ordersLean, 7),
      "30": buildRevenueTrend(ordersLean, 30),
      "90": buildRevenueTrend(ordersLean, 90)
    },
    salesByChannel: computeSalesByChannel(ordersLean)
  };
}
