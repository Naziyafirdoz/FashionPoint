import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/admin/require-admin";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase";
import { isAdminUser } from "@/lib/auth/helpers";
import { resolveOrderEtaZone } from "@/lib/orders/delivery-dates";
import { normalizeOrderRecord, buildStatusUpdatePayloadSafe, persistOrderUpdate } from "@/lib/orders/normalize-order";
import { isRefundSchemaReady } from "@/lib/orders/refund-schema";
import { resolveShippingZone } from "@/lib/shipping/city-detection";
import { assertTransition } from "@/lib/orders/workflow-validation";
import { ORDER_STATUSES } from "@/lib/orders/status-config";
import type { Order, OrderStatus } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

function legacyFulfillmentZone(address: Order["shipping_address"]): NonNullable<Order["fulfillment_zone"]> {
  if (!address) return "outstation";
  const zone = resolveShippingZone(address);
  return zone === "outskirts" ? "outstation" : zone;
}

async function attachFulfillmentZoneSafely(db: SupabaseClient, order: Order): Promise<Order> {
  try {
    const zone = await resolveOrderEtaZone(order, db);
    return {
      ...order,
      fulfillment_zone: zone === "outskirts" ? "outstation" : zone
    };
  } catch (error) {
    console.error("[orders] fulfillment zone error:", error);
    return { ...order, fulfillment_zone: legacyFulfillmentZone(order.shipping_address) };
  }
}

async function attachBranchNameSafely(db: SupabaseClient, order: Order): Promise<Order> {
  const branchId = order.branch_id?.trim() ?? "";
  if (!branchId || branchId.startsWith("legacy-")) {
    return { ...order, branch_name: null };
  }

  try {
    const { data, error } = await db
      .from("branches")
      .select("name")
      .eq("id", branchId)
      .maybeSingle();
    if (error) throw error;
    const name = typeof data?.name === "string" ? data.name : null;
    return { ...order, branch_name: name };
  } catch (error) {
    console.error("[orders] branch name error:", error);
    return { ...order, branch_name: order.branch_name ?? null };
  }
}

export async function GET(_req: Request, { params }: RouteContext) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = createServiceClient();
  if (!db) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  const admin = await isAdminUser(user.id);

  const { data: order, error } = await db
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const row = order as Order;
  if (!admin && row.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const normalized = await normalizeOrderRecord(db, row, { persist: admin });
  const withBranch = admin ? await attachBranchNameSafely(db, normalized) : normalized;
  const withZone = await attachFulfillmentZoneSafely(db, withBranch);
  const refund_tracking_available = admin ? await isRefundSchemaReady(db) : undefined;

  const { count: reviewCount } = await db
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("order_id", id);

  return NextResponse.json({
    order: withZone,
    review_count: reviewCount ?? 0,
    ...(admin ? { refund_tracking_available } : {})
  });
}

const VALID_STATUSES: OrderStatus[] = [...ORDER_STATUSES];

function isValidStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && VALID_STATUSES.includes(value as OrderStatus);
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const { data: existing, error: fetchError } = await auth.ctx.db
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const existingOrder = existing as Order;

  if (typeof body.internal_notes === "string") {
    const { data: updated, error } = await auth.ctx.db
      .from("orders")
      .update({
        internal_notes: body.internal_notes,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const normalized = await normalizeOrderRecord(auth.ctx.db, updated as Order, { persist: false });
    const withBranch = await attachBranchNameSafely(auth.ctx.db, normalized);
    const refund_tracking_available = await isRefundSchemaReady(auth.ctx.db);
    return NextResponse.json({ order: withBranch, refund_tracking_available });
  }

  if (!isValidStatus(body.status)) {
    return NextResponse.json(
      {
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`
      },
      { status: 400 }
    );
  }

  const trackingNumber =
    typeof body.tracking_number === "string" ? body.tracking_number.trim() : "";

  const transitionError = assertTransition(existingOrder.status, body.status);
  if (transitionError) {
    return NextResponse.json({ error: transitionError }, { status: 400 });
  }

  const trackingExtra: Record<string, unknown> = {};
  if (trackingNumber) {
    trackingExtra.tracking_id = trackingNumber;
  }

  const updatePayload = await buildStatusUpdatePayloadSafe(
    auth.ctx.db,
    existingOrder,
    body.status,
    trackingExtra
  );

  const { order, error: updateError } = await persistOrderUpdate(auth.ctx.db, id, updatePayload);

  if (updateError) {
    return NextResponse.json({ error: updateError }, { status: 500 });
  }

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const normalized = await normalizeOrderRecord(auth.ctx.db, order, { persist: true });
  const withBranch = await attachBranchNameSafely(auth.ctx.db, normalized);
  const refund_tracking_available = await isRefundSchemaReady(auth.ctx.db);

  return NextResponse.json({ order: withBranch, refund_tracking_available });
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const { data: existing, error: fetchError } = await auth.ctx.db
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const updatePayload = await buildStatusUpdatePayloadSafe(auth.ctx.db, existing as Order, "cancelled");

  const { order, error: updateError } = await persistOrderUpdate(auth.ctx.db, id, updatePayload);

  if (updateError) {
    return NextResponse.json({ error: updateError }, { status: 500 });
  }

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const normalized = await normalizeOrderRecord(auth.ctx.db, order, { persist: true });
  const withBranch = await attachBranchNameSafely(auth.ctx.db, normalized);
  const refund_tracking_available = await isRefundSchemaReady(auth.ctx.db);

  return NextResponse.json({ order: withBranch, refund_tracking_available });
}
