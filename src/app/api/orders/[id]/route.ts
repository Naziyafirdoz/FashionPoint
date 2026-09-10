import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/admin/require-admin";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase";
import { isAdminUser } from "@/lib/auth/helpers";
import { resolveFulfillmentZoneForOrder } from "@/lib/orders/fulfillment-zone";
import { methodLocked, SHIPMENT_LOCKED_ERROR } from "@/lib/orders/fulfillment-method";
import { normalizeOrderRecord, buildStatusUpdatePayloadSafe, persistOrderUpdate } from "@/lib/orders/normalize-order";
import { isRefundSchemaReady } from "@/lib/orders/refund-schema";
import { assertTransition } from "@/lib/orders/workflow-validation";
import { ORDER_STATUSES } from "@/lib/orders/status-config";
import type { Order, OrderStatus } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

async function attachFulfillmentZoneSafely(db: SupabaseClient, order: Order): Promise<Order> {
  try {
    const resolved = await resolveFulfillmentZoneForOrder(order);
    return { ...order, fulfillment_zone: resolved.zone };
  } catch (error) {
    console.error("[orders] fulfillment zone error:", error);
    return {
      ...order,
      fulfillment_zone:
        order.fulfillment_zone === "local" || order.fulfillment_zone === "outstation"
          ? order.fulfillment_zone
          : "outstation"
    };
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

  // Prefer named fulfillment routes (approve-order, start-packing, pack, ready-for-shipping,
  // mark-shipped, mark-delivered). PATCH status remains for admin tooling and must pass
  // ALLOWED_STATUS_TRANSITIONS.
  if (!isValidStatus(body.status)) {
    return NextResponse.json(
      {
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`
      },
      { status: 400 }
    );
  }

  // Courier (Rapido/DTDC) orders end at shipped — block forcing delivered via PATCH.
  if (
    body.status === "delivered" &&
    (existingOrder.fulfillment_method === "rapido" ||
      existingOrder.fulfillment_method === "dtdc")
  ) {
    return NextResponse.json(
      { error: "Rapido and DTDC orders cannot be marked as delivered." },
      { status: 400 }
    );
  }

  // Courier (Rapido/DTDC) orders end at shipped — block forcing out_for_delivery via PATCH.
  if (
    body.status === "out_for_delivery" &&
    (existingOrder.fulfillment_method === "rapido" ||
      existingOrder.fulfillment_method === "dtdc")
  ) {
    return NextResponse.json(
      { error: "Rapido and DTDC orders cannot be marked out for delivery." },
      { status: 400 }
    );
  }

  const trackingNumber =
    typeof body.tracking_number === "string" ? body.tracking_number.trim() : "";

  // After Confirm Shipping, tracking is final — block overwrite via generic PATCH.
  if (trackingNumber && methodLocked(existingOrder)) {
    const currentTracking =
      existingOrder.tracking_number?.trim() || existingOrder.tracking_id?.trim() || "";
    if (trackingNumber !== currentTracking) {
      return NextResponse.json({ error: SHIPMENT_LOCKED_ERROR }, { status: 409 });
    }
  }

  // Block fulfillment_method changes after shipment (if client sends it).
  if (
    typeof body.fulfillment_method === "string" &&
    body.fulfillment_method.trim() &&
    methodLocked(existingOrder) &&
    body.fulfillment_method.trim() !== (existingOrder.fulfillment_method ?? "")
  ) {
    return NextResponse.json({ error: SHIPMENT_LOCKED_ERROR }, { status: 409 });
  }

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

  if (normalized.status === "cancelled" && existingOrder.status !== "cancelled") {
    try {
      const { sendTemplatedCustomerOrderEmail } = await import(
        "@/lib/server/notifications/send-templated-customer-email"
      );
      await sendTemplatedCustomerOrderEmail({
        eventKey: "order_cancelled",
        order: normalized,
        db: auth.ctx.db
      });
    } catch (err) {
      console.error("[orders PATCH] customer cancelled email failed", {
        orderId: id,
        error: err
      });
    }
  }

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

  if (normalized.status === "cancelled") {
    try {
      const { sendTemplatedCustomerOrderEmail } = await import(
        "@/lib/server/notifications/send-templated-customer-email"
      );
      await sendTemplatedCustomerOrderEmail({
        eventKey: "order_cancelled",
        order: normalized,
        db: auth.ctx.db
      });
    } catch (err) {
      console.error("[orders DELETE] customer cancelled email failed", {
        orderId: id,
        error: err
      });
    }
  }

  return NextResponse.json({ order: withBranch, refund_tracking_available });
}
