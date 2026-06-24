import type { Order, OrderStatus } from "@/types";
import {
  computeInventoryAnalytics,
  type InventoryProductInput
} from "@/lib/admin/inventory-analytics";
import { getInventoryStatus } from "@/lib/admin/inventory";
import { refundAmountForOrder } from "@/lib/orders/refunds";
import { STATUS_CONFIG, type StatusDisplayKey } from "@/lib/orders/status-config";
import type { ReportsCustomRange, ReportsRangeKey } from "@/lib/admin/reports-params";

export type { ReportsCustomRange, ReportsRangeKey } from "@/lib/admin/reports-params";
export { REPORTS_RANGE_OPTIONS } from "@/lib/admin/reports-params";

/** @deprecated Use ReportsRangeKey */
export type ReportsDateFilter = ReportsRangeKey;

/** @deprecated Use REPORTS_RANGE_OPTIONS */
export const REPORTS_DATE_FILTERS = [
  { value: "today" as const, label: "Today" },
  { value: "7d" as const, label: "Last 7 Days" },
  { value: "30d" as const, label: "Last 30 Days" },
  { value: "custom" as const, label: "Custom Range" }
];

const REVENUE_EXCLUDED = new Set<OrderStatus>(["cancelled", "returned"]);

export type SalesReportKpis = {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  refundAmount: number;
  netRevenue: number;
};

export type SalesReportRow = {
  date: string;
  dateLabel: string;
  orders: number;
  revenue: number;
  refunds: number;
  netRevenue: number;
};

export type SalesReportSnapshot = {
  kpis: SalesReportKpis;
  rows: SalesReportRow[];
};

export type OrderReportKpis = {
  totalOrders: number;
  processing: number;
  confirmed: number;
  shipped: number;
  delivered: number;
  cancelled: number;
};

export type OrderReportRow = {
  id: string;
  orderNumber: string;
  customer: string;
  date: string;
  dateLabel: string;
  status: string;
  statusLabel: string;
  amount: number;
};

export type OrderReportSnapshot = {
  kpis: OrderReportKpis;
  rows: OrderReportRow[];
};

export type InventoryReportProductRow = {
  productId: string;
  name: string;
  sku: string;
  currentStock: number;
  unitsSold: number;
  status: string;
  statusLabel: string;
};

export type InventoryReportSnapshot = {
  lowStockProducts: InventoryReportProductRow[];
  outOfStockProducts: InventoryReportProductRow[];
  topSellingProducts: InventoryReportProductRow[];
  slowMovingProducts: InventoryReportProductRow[];
};

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDayLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function isWithinRange(iso: string, start: Date, end: Date): boolean {
  const created = new Date(iso);
  return created >= start && created <= end;
}

export function resolveReportsDateRange(
  filter: ReportsRangeKey,
  custom?: ReportsCustomRange
): { start: Date; end: Date } | null {
  const now = new Date();
  const end = endOfDay(now);

  if (filter === "today") {
    return { start: startOfDay(now), end };
  }

  if (filter === "yesterday") {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
  }

  if (filter === "7d") {
    const start = startOfDay(now);
    start.setDate(start.getDate() - 6);
    return { start, end };
  }

  if (filter === "30d") {
    const start = startOfDay(now);
    start.setDate(start.getDate() - 29);
    return { start, end };
  }

  if (filter === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: startOfDay(start), end };
  }

  if (filter === "prev_month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    return { start: startOfDay(start), end: endOfDay(monthEnd) };
  }

  if (filter === "custom" && custom?.start && custom?.end) {
    const start = startOfDay(new Date(custom.start));
    const customEnd = endOfDay(new Date(custom.end));
    if (Number.isNaN(start.getTime()) || Number.isNaN(customEnd.getTime()) || start > customEnd) {
      return null;
    }
    return { start, end: customEnd };
  }

  return null;
}

function orderRevenue(order: Order): number {
  if (REVENUE_EXCLUDED.has(order.status)) return 0;
  return Number(order.total) || 0;
}

function refundRecordedAt(order: Order): string | null {
  return (
    order.refund_completed_at ??
    order.refund_date ??
    (order.payment_status === "refunded" ? order.updated_at : null) ??
    null
  );
}

function orderRefundAmountInRange(order: Order, start: Date, end: Date): number {
  const recordedAt = refundRecordedAt(order);
  if (!recordedAt || !isWithinRange(recordedAt, start, end)) return 0;
  if (order.payment_status !== "refunded" && order.refund_status !== "refunded" && order.refund_status !== "completed") {
    return 0;
  }
  return refundAmountForOrder(order);
}

function ordersInRange(orders: Order[], start: Date, end: Date): Order[] {
  return orders.filter((order) => isWithinRange(order.created_at, start, end));
}

function enumerateDayKeys(start: Date, end: Date): string[] {
  const keys: string[] = [];
  const cursor = startOfDay(start);
  const last = startOfDay(end);

  while (cursor <= last) {
    keys.push(dayKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return keys;
}

export function computeSalesReport(
  orders: Order[],
  filter: ReportsRangeKey,
  custom?: ReportsCustomRange
): SalesReportSnapshot | null {
  const range = resolveReportsDateRange(filter, custom);
  if (!range) return null;

  const scoped = ordersInRange(orders, range.start, range.end);
  const revenueOrders = scoped.filter((order) => orderRevenue(order) > 0);
  const totalRevenue = revenueOrders.reduce((sum, order) => sum + orderRevenue(order), 0);
  const refundAmount = orders.reduce(
    (sum, order) => sum + orderRefundAmountInRange(order, range.start, range.end),
    0
  );

  const kpis: SalesReportKpis = {
    totalRevenue,
    totalOrders: scoped.length,
    averageOrderValue: revenueOrders.length > 0 ? totalRevenue / revenueOrders.length : 0,
    refundAmount,
    netRevenue: totalRevenue - refundAmount
  };

  const rows: SalesReportRow[] = enumerateDayKeys(range.start, range.end).map((date) => {
    const dayOrders = scoped.filter((order) => dayKey(new Date(order.created_at)) === date);
    const revenue = dayOrders.reduce((sum, order) => sum + orderRevenue(order), 0);
    const refunds = orders.reduce((sum, order) => {
      const recordedAt = refundRecordedAt(order);
      if (!recordedAt || dayKey(new Date(recordedAt)) !== date) return sum;
      return sum + orderRefundAmountInRange(order, range.start, range.end);
    }, 0);

    return {
      date,
      dateLabel: formatDayLabel(date),
      orders: dayOrders.length,
      revenue,
      refunds,
      netRevenue: revenue - refunds
    };
  });

  return { kpis, rows: rows.reverse() };
}

const PROCESSING_STATUSES = new Set<OrderStatus>([
  "processing",
  "packing_assigned",
  "packed",
  "ready_to_ship"
]);

const SHIPPED_STATUSES = new Set<OrderStatus>(["shipped", "out_for_delivery"]);

const CANCELLED_STATUSES = new Set<OrderStatus>([
  "cancelled",
  "cancel_requested",
  "cancellation_approved"
]);

function orderCustomerLabel(order: Order): string {
  const name = order.shipping_address?.name?.trim();
  if (name) return name;
  const email = order.guest_email?.trim();
  if (email) return email;
  return "Guest";
}

function orderPhoneLabel(order: Order): string {
  return order.shipping_address?.phone?.trim() ?? "";
}

export function orderMatchesSalesSearch(order: Order, search: string): boolean {
  const term = search.trim().toLowerCase();
  if (!term) return true;
  return order.order_number.toLowerCase().includes(term);
}

export function orderMatchesOrderReportSearch(order: Order, search: string): boolean {
  const term = search.trim().toLowerCase();
  if (!term) return true;
  return (
    order.order_number.toLowerCase().includes(term) ||
    orderCustomerLabel(order).toLowerCase().includes(term) ||
    orderPhoneLabel(order).toLowerCase().includes(term) ||
    (order.guest_email ?? "").toLowerCase().includes(term)
  );
}

export function inventoryMatchesSearch(row: InventoryReportProductRow, search: string): boolean {
  const term = search.trim().toLowerCase();
  if (!term) return true;
  return row.name.toLowerCase().includes(term) || row.sku.toLowerCase().includes(term);
}

function filterOrdersByRange(orders: Order[], range: { start: Date; end: Date } | null): Order[] {
  if (!range) return orders;
  return ordersInRange(orders, range.start, range.end);
}

function statusLabel(status: string): string {
  const key = status as StatusDisplayKey;
  return STATUS_CONFIG[key]?.label ?? status.replace(/_/g, " ");
}

export function computeOrderReport(
  orders: Order[],
  range?: { start: Date; end: Date } | null
): OrderReportSnapshot {
  const scoped = filterOrdersByRange(orders, range ?? null);

  const kpis: OrderReportKpis = {
    totalOrders: scoped.length,
    processing: scoped.filter((order) => PROCESSING_STATUSES.has(order.status)).length,
    confirmed: scoped.filter((order) => order.status === "confirmed").length,
    shipped: scoped.filter((order) => SHIPPED_STATUSES.has(order.status)).length,
    delivered: scoped.filter((order) => order.status === "delivered").length,
    cancelled: scoped.filter((order) => CANCELLED_STATUSES.has(order.status)).length
  };

  const rows: OrderReportRow[] = [...scoped]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((order) => ({
      id: order.id,
      orderNumber: order.order_number,
      customer: orderCustomerLabel(order),
      date: order.created_at,
      dateLabel: new Date(order.created_at).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }),
      status: order.status,
      statusLabel: statusLabel(order.status),
      amount: Number(order.total) || 0
    }));

  return { kpis, rows };
}

const INVENTORY_STATUS_LABELS = {
  in_stock: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out Of Stock"
} as const;

function toInventoryReportRow(
  product: InventoryProductInput,
  unitsSold: number,
  sku = ""
): InventoryReportProductRow {
  const status = getInventoryStatus(product.total_stock);
  return {
    productId: product.id,
    name: product.name,
    sku,
    currentStock: product.total_stock,
    unitsSold,
    status,
    statusLabel: INVENTORY_STATUS_LABELS[status]
  };
}

export function computeInventoryReport(
  products: InventoryProductInput[],
  orders: Order[],
  range?: { start: Date; end: Date } | null,
  skuByProductId: Record<string, string> = {}
): InventoryReportSnapshot {
  const scopedOrders = filterOrdersByRange(orders, range ?? null);
  const snapshot = computeInventoryAnalytics(products, scopedOrders);
  const unitsSoldByProduct = new Map<string, number>();

  for (const row of snapshot.fastMovingProducts) {
    unitsSoldByProduct.set(row.productId, row.unitsSold);
  }
  for (const row of snapshot.slowMovingProducts) {
    unitsSoldByProduct.set(row.productId, row.unitsSold);
  }

  const productById = new Map(products.map((product) => [product.id, product]));
  const resolveSku = (productId: string) => skuByProductId[productId] ?? "";

  const lowStockProducts = snapshot.lowStockProducts.map((row) => {
    const product = productById.get(row.productId);
    return toInventoryReportRow(
      {
        id: row.productId,
        name: row.name,
        images: row.image ? [row.image] : [],
        status: product?.status ?? "active",
        price: product?.price ?? 0,
        category_id: product?.category_id ?? null,
        category_name: row.categoryName,
        total_stock: row.stock
      },
      unitsSoldByProduct.get(row.productId) ?? 0,
      resolveSku(row.productId)
    );
  });

  const outOfStockProducts = snapshot.outOfStockProducts.map((row) => {
    const product = productById.get(row.productId);
    return toInventoryReportRow(
      {
        id: row.productId,
        name: row.name,
        images: row.image ? [row.image] : [],
        status: product?.status ?? "active",
        price: product?.price ?? 0,
        category_id: product?.category_id ?? null,
        category_name: row.categoryName,
        total_stock: row.stock
      },
      unitsSoldByProduct.get(row.productId) ?? 0,
      resolveSku(row.productId)
    );
  });

  const topSellingProducts = snapshot.fastMovingProducts.map((row) => {
    const product = productById.get(row.productId);
    return toInventoryReportRow(
      {
        id: row.productId,
        name: row.name,
        images: row.image ? [row.image] : [],
        status: product?.status ?? "active",
        price: product?.price ?? 0,
        category_id: product?.category_id ?? null,
        category_name: product?.category_name ?? null,
        total_stock: row.currentStock
      },
      row.unitsSold,
      resolveSku(row.productId)
    );
  });

  const slowMovingProducts = snapshot.slowMovingProducts.map((row) => {
    const product = productById.get(row.productId);
    return toInventoryReportRow(
      {
        id: row.productId,
        name: row.name,
        images: row.image ? [row.image] : [],
        status: product?.status ?? "active",
        price: product?.price ?? 0,
        category_id: product?.category_id ?? null,
        category_name: product?.category_name ?? null,
        total_stock: row.currentStock
      },
      row.unitsSold,
      resolveSku(row.productId)
    );
  });

  return {
    lowStockProducts,
    outOfStockProducts,
    topSellingProducts,
    slowMovingProducts
  };
}
