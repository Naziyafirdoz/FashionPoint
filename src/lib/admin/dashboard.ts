import type { SupabaseClient } from "@supabase/supabase-js";
import {
  countInventoryStatusRows,
  listInventoryVariants
} from "@/lib/admin/inventory";
import type { Order } from "@/types";

export type DashboardKpis = {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  outOfStockProducts: number;
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

export type DashboardRevenuePoint = {
  date: string;
  revenue: number;
  orders: number;
};

export type DashboardOrderLean = Pick<
  Order,
  "id" | "order_number" | "total" | "status" | "created_at" | "shipping_address" | "guest_email"
>;

export type DashboardData = {
  kpis: DashboardKpis;
  ordersLean: DashboardOrderLean[];
  reviewTimestamps: string[];
};

const REVENUE_EXCLUDED_STATUSES = new Set(["cancelled", "returned"]);

/** Lean projection — excludes heavy `items` jsonb from the main orders scan. */
const DASHBOARD_ORDER_LEAN_SELECT =
  "id, order_number, total, status, created_at, shipping_address, guest_email";

export async function getDashboardData(db: SupabaseClient): Promise<DashboardData> {
  const [ordersLeanResult, customersResult, productsResult, reviewsResult, inventoryVariants] =
    await Promise.all([
      db
        .from("orders")
        .select(DASHBOARD_ORDER_LEAN_SELECT)
        .order("created_at", { ascending: false }),
      db.from("customers").select("*", { count: "exact", head: true }),
      db.from("products").select("*", { count: "exact", head: true }),
      db.from("reviews").select("created_at"),
      listInventoryVariants(db)
    ]);

  const ordersLean = (ordersLeanResult.data ?? []) as DashboardOrderLean[];
  const reviewTimestamps = ((reviewsResult.data ?? []) as Array<{ created_at: string }>).map(
    (review) => review.created_at
  );
  const inventoryCounts = countInventoryStatusRows(inventoryVariants);

  const kpis: DashboardKpis = {
    totalRevenue: ordersLean
      .filter((o) => !REVENUE_EXCLUDED_STATUSES.has(o.status))
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0),
    totalOrders: ordersLeanResult.error ? 0 : ordersLean.length,
    totalCustomers: customersResult.error ? 0 : (customersResult.count ?? 0),
    totalProducts: productsResult.error ? 0 : (productsResult.count ?? 0),
    outOfStockProducts: inventoryCounts.outOfStock,
    lowStockProducts: inventoryCounts.lowStock,
    totalReviews: reviewsResult.error ? 0 : reviewTimestamps.length
  };

  return {
    kpis,
    ordersLean,
    reviewTimestamps
  };
}
