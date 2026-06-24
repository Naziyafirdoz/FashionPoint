import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ADMIN_ORDER_LIST_SELECT,
  INVENTORY_REPORT_ORDER_SELECT
} from "@/lib/admin/fetch-all-orders";
import { listAdminProducts } from "@/lib/admin/products";
import { listAdminReviews } from "@/lib/admin/reviews";
import { listInventoryVariants } from "@/lib/admin/inventory";
import {
  buildInventoryReportCacheKey,
  getInventoryReportCache,
  setInventoryReportCache
} from "@/lib/admin/inventory-report-cache";
import type { InventoryProductInput } from "@/lib/admin/inventory-analytics";
import {
  DEFAULT_REPORT_PAGE_SIZE,
  REPORT_PAGE_SIZES,
  type ReportPageSize,
  type ReportsRangeKey
} from "@/lib/admin/reports-params";
import {
  computeInventoryReport,
  computeOrderReport,
  computeSalesReport,
  inventoryMatchesSearch,
  orderMatchesOrderReportSearch,
  orderMatchesSalesSearch,
  resolveReportsDateRange,
  type InventoryReportProductRow,
  type InventoryReportSnapshot,
  type OrderReportRow,
  type SalesReportRow
} from "@/lib/admin/reports";
import { applyPaymentRulesToOrder } from "@/lib/orders/payment-rules";
import type { Order } from "@/types";

export const REPORT_MAX_LIMIT = 250;
const AGGREGATION_CHUNK_SIZE = 500;
/** Smaller chunks when loading order line items (large jsonb payloads). */
const INVENTORY_AGGREGATION_CHUNK_SIZE = 100;

const INVENTORY_EXCLUDED_STATUSES = ["cancelled", "returned"] as const;

export function formatReportServerError(error: unknown): string {
  if (error && typeof error === "object") {
    const record = error as { message?: string; code?: string };
    if (record.message) {
      return record.code ? `${record.message} (${record.code})` : record.message;
    }
  }
  if (error instanceof Error) return error.message;
  return "Unknown error";
}

export type ParsedReportRequest = {
  range: ReportsRangeKey;
  from?: string;
  to?: string;
  page: number;
  limit: ReportPageSize;
  search: string;
  dateRange: { start: Date; end: Date } | null;
};

export function parseReportRequest(searchParams: URLSearchParams): ParsedReportRequest {
  const range = (searchParams.get("range") ?? "30d") as ReportsRangeKey;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const custom = from && to ? { start: from, end: to } : undefined;
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const limitParam = Number(searchParams.get("limit") ?? String(DEFAULT_REPORT_PAGE_SIZE));
  const limit = REPORT_PAGE_SIZES.includes(limitParam as ReportPageSize)
    ? (limitParam as ReportPageSize)
    : DEFAULT_REPORT_PAGE_SIZE;
  const search = searchParams.get("search")?.trim() ?? "";

  return {
    range,
    from,
    to,
    page,
    limit,
    search,
    dateRange: resolveReportsDateRange(range, custom)
  };
}

function paginate<T>(items: T[], page: number, limit: number) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    total,
    page: safePage,
    limit,
    totalPages
  };
}

function applyInventoryReportView(
  snapshot: InventoryReportSnapshot,
  request: ParsedReportRequest
) {
  return {
    lowStockProducts: paginate(
      snapshot.lowStockProducts.filter((row) => inventoryMatchesSearch(row, request.search)),
      request.page,
      request.limit
    ),
    outOfStockProducts: paginate(
      snapshot.outOfStockProducts.filter((row) => inventoryMatchesSearch(row, request.search)),
      request.page,
      request.limit
    ),
    topSellingProducts: paginate(
      snapshot.topSellingProducts.filter((row) => inventoryMatchesSearch(row, request.search)),
      request.page,
      request.limit
    ),
    slowMovingProducts: paginate(
      snapshot.slowMovingProducts.filter((row) => inventoryMatchesSearch(row, request.search)),
      request.page,
      request.limit
    )
  };
}

async function buildInventoryReportSnapshot(
  db: SupabaseClient,
  dateRange: { start: Date; end: Date }
): Promise<InventoryReportSnapshot> {
  const [productRows, orders] = await Promise.all([
    listAdminProducts(db),
    fetchInventoryOrdersInRange(db, dateRange.start, dateRange.end)
  ]);

  const products: InventoryProductInput[] = productRows.map((product) => ({
    id: product.id,
    name: product.name,
    images: product.images,
    status: product.status,
    price: product.price,
    category_id: product.category_id,
    category_name: product.category_name,
    total_stock: product.total_stock
  }));

  const skuByProductId = Object.fromEntries(productRows.map((product) => [product.id, product.slug]));

  return computeInventoryReport(products, orders, dateRange, skuByProductId);
}

async function fetchOrdersInRange(
  db: SupabaseClient,
  start: Date,
  end: Date
): Promise<Order[]> {
  const all: Order[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await db
      .from("orders")
      .select(ADMIN_ORDER_LIST_SELECT)
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("created_at", { ascending: false })
      .range(offset, offset + AGGREGATION_CHUNK_SIZE - 1);

    if (error) throw error;

    const batch = (data ?? []).map((row) => applyPaymentRulesToOrder(row as unknown as Order));
    all.push(...batch);

    if (batch.length < AGGREGATION_CHUNK_SIZE) break;
    offset += AGGREGATION_CHUNK_SIZE;
  }

  return all;
}

async function fetchInventoryOrdersInRange(
  db: SupabaseClient,
  start: Date,
  end: Date
): Promise<Order[]> {
  const all: Order[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await db
      .from("orders")
      .select(INVENTORY_REPORT_ORDER_SELECT)
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .notIn("status", [...INVENTORY_EXCLUDED_STATUSES])
      .order("created_at", { ascending: false })
      .range(offset, offset + INVENTORY_AGGREGATION_CHUNK_SIZE - 1);

    if (error) throw error;

    const batch = (data ?? []) as Order[];
    all.push(...batch);

    if (batch.length < INVENTORY_AGGREGATION_CHUNK_SIZE) break;
    offset += INVENTORY_AGGREGATION_CHUNK_SIZE;
  }

  return all;
}

export async function buildSalesReportResponse(
  db: SupabaseClient,
  request: ParsedReportRequest
) {
  if (!request.dateRange) {
    return { error: "Invalid date range", status: 400 as const };
  }

  const orders = await fetchOrdersInRange(
    db,
    request.dateRange.start,
    request.dateRange.end
  );
  const report = computeSalesReport(orders, request.range, {
    start: request.from ?? "",
    end: request.to ?? ""
  });

  if (!report) {
    return { error: "Invalid date range", status: 400 as const };
  }

  let tableRows: SalesReportRow[] = report.rows;
  let tableLabel = "daily";

  if (request.search) {
    const matchingOrders = orders
      .filter((order) => orderMatchesSalesSearch(order, request.search))
      .map((order) => ({
        date: order.created_at,
        dateLabel: new Date(order.created_at).toLocaleString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        }),
        orders: 1,
        revenue: Number(order.total) || 0,
        refunds: 0,
        netRevenue: Number(order.total) || 0,
        orderNumber: order.order_number
      }));
    tableRows = matchingOrders as SalesReportRow[];
    tableLabel = "orders";
  }

  const paged = paginate(tableRows, request.page, request.limit);

  return {
    status: 200 as const,
    data: {
      kpis: report.kpis,
      tableLabel,
      rows: paged.items,
      total: paged.total,
      page: paged.page,
      limit: paged.limit,
      totalPages: paged.totalPages,
      updatedAt: new Date().toISOString()
    }
  };
}

export async function buildOrderReportResponse(
  db: SupabaseClient,
  request: ParsedReportRequest
) {
  if (!request.dateRange) {
    return { error: "Invalid date range", status: 400 as const };
  }

  const orders = await fetchOrdersInRange(
    db,
    request.dateRange.start,
    request.dateRange.end
  );
  const report = computeOrderReport(orders, request.dateRange);
  const filteredRows = report.rows.filter((row) => {
    const order = orders.find((item) => item.id === row.id);
    return order ? orderMatchesOrderReportSearch(order, request.search) : false;
  });

  const paged = paginate(filteredRows, request.page, request.limit);

  return {
    status: 200 as const,
    data: {
      kpis: report.kpis,
      rows: paged.items,
      total: paged.total,
      page: paged.page,
      limit: paged.limit,
      totalPages: paged.totalPages,
      updatedAt: new Date().toISOString()
    }
  };
}

type InventorySectionKey =
  | "lowStockProducts"
  | "outOfStockProducts"
  | "topSellingProducts"
  | "slowMovingProducts";

export async function buildInventoryReportResponse(
  db: SupabaseClient,
  request: ParsedReportRequest,
  section: InventorySectionKey,
  options: { forceRefresh?: boolean } = {}
) {
  if (!request.dateRange) {
    return { error: "Invalid date range", status: 400 as const };
  }

  const dateRange = request.dateRange;
  const cacheKey = buildInventoryReportCacheKey(request.range, request.from, request.to);

  try {
    let snapshot: InventoryReportSnapshot;
    let builtAt: number;

    const cached = options.forceRefresh ? null : getInventoryReportCache(cacheKey);
    if (cached) {
      snapshot = cached.snapshot;
      builtAt = cached.builtAt;
    } else {
      snapshot = await buildInventoryReportSnapshot(db, dateRange);
      builtAt = setInventoryReportCache(cacheKey, snapshot);
    }

    const sectionRows = snapshot[section].filter((row) =>
      inventoryMatchesSearch(row, request.search)
    );
    const paged = paginate(sectionRows, request.page, request.limit);

    return {
      status: 200 as const,
      data: {
        section,
        rows: paged.items,
        total: paged.total,
        page: paged.page,
        limit: paged.limit,
        totalPages: paged.totalPages,
        updatedAt: new Date(builtAt).toISOString()
      }
    };
  } catch (error) {
    console.error("[inventory-report] Section build failed:", section, error);
    return {
      error: formatReportServerError(error),
      status: 500 as const
    };
  }
}

export async function buildInventoryReportBundle(
  db: SupabaseClient,
  request: ParsedReportRequest,
  options: { forceRefresh?: boolean } = {}
) {
  if (!request.dateRange) {
    return { error: "Invalid date range", status: 400 as const };
  }

  const dateRange = request.dateRange;
  const cacheKey = buildInventoryReportCacheKey(request.range, request.from, request.to);

  try {
    let snapshot: InventoryReportSnapshot;
    let builtAt: number;
    let fromCache = false;

    const cached = options.forceRefresh ? null : getInventoryReportCache(cacheKey);
    if (cached) {
      snapshot = cached.snapshot;
      builtAt = cached.builtAt;
      fromCache = true;
      console.log("[inventory-report] Cache hit for", cacheKey);
    } else {
      console.log("[inventory-report] Cache miss — rebuilding snapshot for", cacheKey);
      snapshot = await buildInventoryReportSnapshot(db, dateRange);
      builtAt = setInventoryReportCache(cacheKey, snapshot);
    }

    const sections = applyInventoryReportView(snapshot, request);

    return {
      status: 200 as const,
      data: {
        sections,
        updatedAt: new Date(builtAt).toISOString(),
        cached: fromCache
      }
    };
  } catch (error) {
    console.error("[inventory-report] Bundle build failed:", error);
    return {
      error: formatReportServerError(error),
      status: 500 as const
    };
  }
}

export async function buildExportDataset(
  db: SupabaseClient,
  request: ParsedReportRequest,
  dataset: "orders" | "products" | "inventory" | "reviews"
) {
  if (!request.dateRange) {
    return { error: "Invalid date range", status: 400 as const };
  }

  if (dataset === "orders" && request.dateRange) {
    const orders = await fetchOrdersInRange(
      db,
      request.dateRange.start,
      request.dateRange.end
    );
    const report = computeOrderReport(orders, request.dateRange);
    return {
      status: 200 as const,
      data: {
        rows: report.rows.filter((row) => {
          const order = orders.find((item) => item.id === row.id);
          return order ? orderMatchesOrderReportSearch(order, request.search) : true;
        })
      }
    };
  }

  if (dataset === "products") {
    const products = await listAdminProducts(db);
    const filteredProducts = request.dateRange
      ? products.filter((product) => {
          const created = new Date(product.created_at);
          return created >= request.dateRange!.start && created <= request.dateRange!.end;
        })
      : products;
    return {
      status: 200 as const,
      data: {
        products: filteredProducts
      }
    };
  }

  if (dataset === "inventory") {
    const rows = await listInventoryVariants(db);
    return {
      status: 200 as const,
      data: {
        rows
      }
    };
  }

  const reviews = await listAdminReviews(db);
  const filteredReviews = reviews.filter((review) => {
    if (!request.dateRange) return true;
    const created = new Date(review.created_at);
    return created >= request.dateRange.start && created <= request.dateRange.end;
  });

  return {
    status: 200 as const,
    data: {
      reviews: filteredReviews
    }
  };
}

export type { OrderReportRow, SalesReportRow };
