import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase";
import { isAdminUser } from "@/lib/auth/helpers";
import { orderMatchesPaymentFilter, orderMatchesSearch } from "@/lib/admin/notifications/orders-view";
import { fetchAdminOrderStats } from "@/lib/orders/admin-stats";
import { matchesOrderListFilter, resolveOrderListFilter } from "@/lib/orders/order-list-filter";
import { isCancellationSchemaReady } from "@/lib/orders/cancellation-schema";
import { normalizeCustomerOrderRow } from "@/lib/orders/normalize-order";
import { fetchCustomerOrdersForUser } from "@/lib/orders/customer-order-retrieval";
import type { AdminOrderStatsV2 } from "@/lib/orders/refund-queue";
import { isRefundSchemaReady } from "@/lib/orders/refund-schema";
import type { Order } from "@/types";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

let ordersApiRequestCount = 0;

type OrderQueryDebugMeta = {
  source: string;
  columns: string;
  count: "exact" | "estimated" | "none";
  page?: number;
  limit?: number;
  offset?: number;
  filters: Record<string, unknown>;
  nestedJoins: boolean;
};

function logOrderQueryStart(meta: OrderQueryDebugMeta): string {
  const timerLabel = `orders-${Date.now()}-${Math.random()}`;
  console.info("[orders-debug] query start", meta);
  console.time(timerLabel);
  return timerLabel;
}

function logOrderQueryEnd(
  timerLabel: string,
  meta: OrderQueryDebugMeta,
  extra?: Record<string, unknown>
) {
  console.timeEnd(timerLabel);
  console.info("[orders-debug] query end", { ...meta, ...extra });
}

const FALLBACK_ADMIN_STATS: AdminOrderStatsV2 = {
  total: 0,
  pending: 0,
  processing: 0,
  readyToShip: 0,
  outForDelivery: 0,
  delivered: 0,
  cancelled: 0,
  pendingCancellations: 0,
  refundPending: 0,
  refunded: 0,
  customerCancellationRefunds: 0,
  returnRequests: 0,
  returnsApproved: 0,
  overdueRefunds: 0
};

async function loadAdminStatsSafely(db: SupabaseClient): Promise<AdminOrderStatsV2> {
  console.time("[orders] stats");
  try {
    const stats = await fetchAdminOrderStats(db);
    console.info("[orders] stats rows", { total: stats.total });
    return stats;
  } catch (error) {
    console.error("[orders] stats error:", error);
    return FALLBACK_ADMIN_STATS;
  } finally {
    console.timeEnd("[orders] stats");
  }
}

async function attachReviewCountsSafely(
  db: SupabaseClient,
  orders: Order[]
): Promise<Order[]> {
  if (orders.length === 0) return orders;

  const orderIds = orders.map((o) => o.id);
  const reviewsMeta: OrderQueryDebugMeta = {
    source: "admin-review-counts",
    columns: "order_id",
    count: "none",
    filters: { orderIds: orderIds.length },
    nestedJoins: false
  };
  console.time("[orders] reviews");
  const reviewsTimer = logOrderQueryStart(reviewsMeta);
  try {
    const { data: reviewRows, error } = await db
      .from("reviews")
      .select("order_id")
      .in("order_id", orderIds);

    if (error) throw error;

    logOrderQueryEnd(reviewsTimer, reviewsMeta, { rows: reviewRows?.length ?? 0 });

    const countByOrder = new Map<string, number>();
    for (const row of reviewRows ?? []) {
      const oid = String((row as { order_id: string }).order_id);
      countByOrder.set(oid, (countByOrder.get(oid) ?? 0) + 1);
    }

    return orders.map((o) => ({
      ...o,
      review_count: countByOrder.get(o.id) ?? 0
    }));
  } catch (error) {
    console.error("[orders] reviews error:", error);
    logOrderQueryEnd(reviewsTimer, reviewsMeta, { failed: true });
    return orders;
  } finally {
    console.timeEnd("[orders] reviews");
  }
}

export async function GET(req: Request) {
  ordersApiRequestCount += 1;
  const ordersApiStarted = performance.now();
  console.log("API ORDERS CALLED", { count: ordersApiRequestCount });
  console.time("[orders] total");
  try {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const tabParam = url.searchParams.get("tab") ?? url.searchParams.get("status");
  const listFilter = resolveOrderListFilter(tabParam);
  const paymentMethod = url.searchParams.get("payment_method");
  const search = url.searchParams.get("search")?.trim();
  const includeReviewCounts = url.searchParams.get("include_review_counts") === "true";
  const includeStats = url.searchParams.get("include_stats") === "true";
  const statsOnly = url.searchParams.get("stats_only") === "true";
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number(url.searchParams.get("limit") ?? String(DEFAULT_LIMIT)) || DEFAULT_LIMIT)
  );
  const offset = (page - 1) * limit;

  const db = createServiceClient();
  if (!db) {
    return NextResponse.json({ orders: [], source: "mock" });
  }

  const admin = await isAdminUser(user.id);

  if (admin && statsOnly) {
    let stats: AdminOrderStatsV2 | undefined;
    let refund_tracking_available: boolean | undefined;
    if (includeStats) {
      try {
        refund_tracking_available = await isRefundSchemaReady(db);
      } catch {
        refund_tracking_available = undefined;
      }
      stats = await loadAdminStatsSafely(db);
    }
    return NextResponse.json({
      orders: [],
      total: 0,
      page,
      limit,
      source: "supabase",
      role: "admin",
      filter: { kind: "all" },
      ...(includeStats ? { refund_tracking_available, stats } : {})
    });
  }

  let orders: Order[] = [];
  let count: number | null = null;

  if (admin && listFilter.kind !== "returns") {
    let query = db
      .from("orders")
      .select("*", { count: "estimated" })
      .order("created_at", { ascending: false });

    if (listFilter.kind === "status") {
      query = query.eq("status", listFilter.status);
    }

    if (listFilter.kind === "payment_status") {
      query = query.eq("payment_status", listFilter.payment_status);
    }

    if (listFilter.kind === "cancelled_awaiting_refund") {
      query = query.or(
        "status.eq.cancel_requested,status.eq.cancellation_approved,and(status.eq.cancelled,or(refund_status.in.(initiated,pending,refund_details_submitted,refund_pending),and(refund_status.is.null,payment_status.eq.refund_pending)))"
      );
    }

    if (listFilter.kind === "cancelled_refunded") {
      query = query.eq("status", "cancelled");
      const cancellationReady = await isCancellationSchemaReady(db);
      if (cancellationReady) {
        query = query.or("refund_status.eq.completed,payment_status.eq.refunded");
      } else {
        query = query.eq("payment_status", "refunded");
      }
    }

    if (paymentMethod && paymentMethod !== "all") {
      query = query.eq("payment_method", paymentMethod);
    }

    if (search) {
      const term = `%${search}%`;
      query = query.or(
        `order_number.ilike.${term},guest_email.ilike.${term},shipping_address->>name.ilike.${term},shipping_address->>phone.ilike.${term}`
      );
    }

    query = query.range(offset, offset + limit - 1);

    const adminQueryMeta: OrderQueryDebugMeta = {
      source: "admin-orders",
      columns: "*",
      count: "estimated",
      page,
      limit,
      offset,
      filters: {
        listFilter,
        paymentMethod: paymentMethod ?? null,
        search: search ?? null
      },
      nestedJoins: false
    };

    const adminQueryTimer = logOrderQueryStart(adminQueryMeta);
    console.time("[orders] rows");
    const { data, error, count: queryCount } = await query;
    console.timeEnd("[orders] rows");
    logOrderQueryEnd(adminQueryTimer, adminQueryMeta, {
      rows: data?.length ?? 0,
      total: queryCount ?? null,
      errorCode: error?.code ?? null,
      errorMessage: error?.message ?? null
    });

    if (error) {
      console.error("Orders query error:", {
        code: error.code,
        message: error.message
      });

      return NextResponse.json(
        {
          error: error.message,
          details: error
        },
        { status: 500 }
      );
    }

    orders = (data ?? []) as Order[];
    count = queryCount;
  } else if (!admin) {
    const { orders: customerOrders, error: customerFetchError } = await fetchCustomerOrdersForUser(
      db,
      user.id,
      user.email,
      { limit }
    );
    if (customerFetchError) {
      console.error("[customer-orders]", customerFetchError);
    }

    let filtered = customerOrders;
    filtered = filtered.filter((order) => matchesOrderListFilter(order, listFilter));
    if (paymentMethod && paymentMethod !== "all") {
      filtered = filtered.filter((order) => orderMatchesPaymentFilter(order, paymentMethod));
    }
    if (search) {
      filtered = filtered.filter((order) => orderMatchesSearch(order, search));
    }

    count = filtered.length;
    orders = filtered.slice(offset, offset + limit);
  } else {
    let query = db
      .from("orders")
      .select("*", { count: "estimated" })
      .order("created_at", { ascending: false });

    if (listFilter.kind === "status") {
      query = query.eq("status", listFilter.status);
    }

    if (listFilter.kind === "payment_status") {
      query = query.eq("payment_status", listFilter.payment_status);
    }

    if (listFilter.kind === "cancelled_awaiting_refund") {
      query = query.or(
        "status.eq.cancel_requested,status.eq.cancellation_approved,and(status.eq.cancelled,or(refund_status.in.(initiated,pending,refund_details_submitted,refund_pending),and(refund_status.is.null,payment_status.eq.refund_pending)))"
      );
    }

    if (listFilter.kind === "cancelled_refunded") {
      query = query.eq("status", "cancelled");
      const cancellationReady = await isCancellationSchemaReady(db);
      if (cancellationReady) {
        query = query.or("refund_status.eq.completed,payment_status.eq.refunded");
      } else {
        query = query.eq("payment_status", "refunded");
      }
    }

    if (paymentMethod && paymentMethod !== "all") {
      query = query.eq("payment_method", paymentMethod);
    }

    if (search) {
      const term = `%${search}%`;
      query = query.or(
        `order_number.ilike.${term},guest_email.ilike.${term},shipping_address->>name.ilike.${term},shipping_address->>phone.ilike.${term}`
      );
    }

    if (listFilter.kind === "returns") {
      const returnsMeta: OrderQueryDebugMeta = {
        source: "admin-returns-order-ids",
        columns: "order_id",
        count: "none",
        filters: { listFilter },
        nestedJoins: false
      };
      const returnsTimer = logOrderQueryStart(returnsMeta);
      const { data: returnRows } = await db.from("return_requests").select("order_id");
      logOrderQueryEnd(returnsTimer, returnsMeta, { rows: returnRows?.length ?? 0 });
      const returnOrderIds = (returnRows ?? []).map((r) => String((r as { order_id: string }).order_id));
      if (returnOrderIds.length === 0) {
        let refund_tracking_available: boolean | undefined;
        let stats: AdminOrderStatsV2 | undefined;
        if (admin && includeStats) {
          try {
            refund_tracking_available = await isRefundSchemaReady(db);
          } catch {
            refund_tracking_available = undefined;
          }
          stats = await loadAdminStatsSafely(db);
        }
        return NextResponse.json({
          orders: [],
          total: 0,
          page,
          limit,
          source: "supabase",
          role: admin ? "admin" : "customer",
          filter: listFilter,
          ...(admin ? { refund_tracking_available, stats } : {})
        });
      }
      query = query.in("id", returnOrderIds);
    }

    query = query.range(offset, offset + limit - 1);

    const listQueryMeta: OrderQueryDebugMeta = {
      source: "admin-returns-orders",
      columns: "*",
      count: "estimated",
      page,
      limit,
      offset,
      filters: {
        listFilter,
        paymentMethod: paymentMethod ?? null,
        search: search ?? null
      },
      nestedJoins: false
    };

    const listQueryTimer = logOrderQueryStart(listQueryMeta);
    const { data, error, count: queryCount } = await query;
    logOrderQueryEnd(listQueryTimer, listQueryMeta, {
      rows: data?.length ?? 0,
      total: queryCount ?? null,
      errorCode: error?.code ?? null,
      errorMessage: error?.message ?? null
    });

    if (error) {
      console.error("Orders query error:", {
        code: error.code,
        message: error.message
      });

      return NextResponse.json(
        {
          error: error.message,
          details: error
        },
        { status: 500 }
      );
    }

    orders = (data ?? []) as Order[];
    count = queryCount;
  }

  if (admin && includeReviewCounts && orders.length > 0) {
    orders = await attachReviewCountsSafely(db, orders);
  }

  if (admin && orders.length > 0) {
    // TEMP DEBUG: normalizeAdminOrderList disabled to isolate 57014 timeout
    orders = orders;
  } else if (orders.length > 0) {
    orders = orders.map(normalizeCustomerOrderRow);
  }

  let refund_tracking_available: boolean | undefined;
  let stats: AdminOrderStatsV2 | undefined;
  if (admin && includeStats) {
    try {
      refund_tracking_available = await isRefundSchemaReady(db);
    } catch {
      refund_tracking_available = undefined;
    }
    stats = await loadAdminStatsSafely(db);
  }

  return NextResponse.json({
    orders,
    total: count ?? orders.length,
    page,
    limit,
    source: "supabase",
    role: admin ? "admin" : "customer",
    filter: listFilter,
    ...(admin ? { refund_tracking_available, stats } : {})
  });
  } catch (error) {
    console.error("API /orders crashed:", error);

    return NextResponse.json(
      {
        error: String(error)
      },
      { status: 500 }
    );
  } finally {
    console.log("[orders] elapsed", performance.now() - ordersApiStarted, {
      count: ordersApiRequestCount
    });
    console.timeEnd("[orders] total");
  }
}
