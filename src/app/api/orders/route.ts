import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase";
import { isAdminUser } from "@/lib/auth/helpers";
import { fetchAdminOrderStats } from "@/lib/orders/admin-stats";
import { resolveOrderListFilter } from "@/lib/orders/order-list-filter";
import { isCancellationSchemaReady } from "@/lib/orders/cancellation-schema";
import { normalizeOrderRecord } from "@/lib/orders/normalize-order";
import { isRefundSchemaReady } from "@/lib/orders/refund-schema";
import type { Order } from "@/types";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function GET(req: Request) {
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

  let query = db.from("orders").select("*", { count: "exact" }).order("created_at", { ascending: false });

  if (!admin) {
    query = query.eq("user_id", user.id);
  }

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

  if (listFilter.kind === "returns" && admin) {
    const { data: returnRows } = await db.from("return_requests").select("order_id");
    const returnOrderIds = (returnRows ?? []).map((r) => String((r as { order_id: string }).order_id));
    if (returnOrderIds.length === 0) {
      const refund_tracking_available = admin ? await isRefundSchemaReady(db) : undefined;
      const stats = admin && includeStats ? await fetchAdminOrderStats(db) : undefined;
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

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let orders = (data ?? []) as Order[];

  if (admin && includeReviewCounts && orders.length > 0) {
    const orderIds = orders.map((o) => o.id);
    const { data: reviewRows } = await db
      .from("reviews")
      .select("order_id")
      .in("order_id", orderIds);

    const countByOrder = new Map<string, number>();
    for (const row of reviewRows ?? []) {
      const oid = String((row as { order_id: string }).order_id);
      countByOrder.set(oid, (countByOrder.get(oid) ?? 0) + 1);
    }

    orders = orders.map((o) => ({
      ...o,
      review_count: countByOrder.get(o.id) ?? 0
    }));
  }

  if (admin && orders.length > 0) {
    orders = await Promise.all(
      orders.map((o) => normalizeOrderRecord(db, o, { persist: true }))
    );
  } else if (orders.length > 0) {
    orders = await Promise.all(orders.map((o) => normalizeOrderRecord(db, o)));
  }

  const refund_tracking_available = admin ? await isRefundSchemaReady(db) : undefined;
  const stats = admin && includeStats ? await fetchAdminOrderStats(db) : undefined;

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
}
