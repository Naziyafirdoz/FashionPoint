import { NextResponse } from "next/server";
import { requireDeliveryStaff } from "@/lib/admin/require-staff";
import { hasRole, isOwnerOrAdmin } from "@/lib/admin/staff";
import { normalizeOrderRecord } from "@/lib/orders/normalize-order";
import { processDeliveredNotification } from "@/lib/server/notifications/delivered-route-handler";
import { assertTransition } from "@/lib/orders/workflow-validation";
import { normalizeLegacyStatus } from "@/lib/orders/status-config";
import { invalidateAdminDataCaches } from "@/lib/admin/invalidate-admin-caches";
import type { Order } from "@/types";
import type { StaffRole } from "@/lib/admin/require-staff";

type RouteContext = { params: Promise<{ id: string }> };

function canMarkDelivered(
  roles: StaffRole[],
  userId: string,
  order: Order
): { ok: true } | { ok: false; error: string } {
  if (isOwnerOrAdmin(roles)) {
    return { ok: true };
  }

  if (hasRole(roles, "delivery_worker")) {
    const assigned = order.assigned_delivery_worker_id?.trim() ?? "";
    if (!assigned || assigned !== userId) {
      return { ok: false, error: "You can only mark orders assigned to you as delivered." };
    }
    const status = normalizeLegacyStatus(order.status);
    if (status !== "out_for_delivery" && status !== "shipped") {
      return {
        ok: false,
        error: "Order is not eligible for delivery confirmation."
      };
    }
    return { ok: true };
  }

  return { ok: false, error: "Forbidden" };
}

export async function POST(_req: Request, { params }: RouteContext) {
  const auth = await requireDeliveryStaff();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const { data: existing, error: fetchError } = await auth.ctx.db
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: "Unable to load order" }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const order = existing as Order;
  const authz = canMarkDelivered(auth.ctx.roles, auth.ctx.userId, order);
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: 403 });
  }

  if (order.fulfillment_method === "rapido" || order.fulfillment_method === "dtdc") {
    return NextResponse.json(
      { error: "Rapido and DTDC orders cannot be marked as delivered." },
      { status: 400 }
    );
  }

  const isAdminOverride = isOwnerOrAdmin(auth.ctx.roles);
  if (
    !isAdminOverride &&
    hasRole(auth.ctx.roles, "delivery_worker") &&
    order.fulfillment_method === "delivery_boy"
  ) {
    return NextResponse.json(
      {
        error:
          "Delivery Staff orders require OTP verification. Use Verify Delivery with the customer OTP."
      },
      { status: 400 }
    );
  }

  const status = order.status as string;
  const transitionError = assertTransition(status, "delivered");
  if (transitionError) {
    return NextResponse.json({ error: transitionError }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await auth.ctx.db
    .from("orders")
    .update({
      status: "delivered",
      delivery_confirmed_at: now,
      updated_at: now
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[mark-delivered] update failed", { orderId: id, message: error.message });
    return NextResponse.json({ error: "Unable to mark delivered" }, { status: 500 });
  }

  const normalized = await normalizeOrderRecord(auth.ctx.db, updated as Order, { persist: false });
  console.info("[mark-delivered] success", { orderId: id });
  invalidateAdminDataCaches();

  try {
    console.info("[delivered-email] sending", { orderId: id });
    const outcome = await processDeliveredNotification(auth.ctx.db, id);
    if (outcome.ok && outcome.result !== "failed") {
      console.info("[delivered-email] success", { orderId: id, result: outcome.result });
    } else {
      console.error("[delivered-email] failed", {
        orderId: id,
        error: outcome.ok ? outcome.result : outcome.error
      });
    }
  } catch (err) {
    console.error("[delivered-email] failed", { orderId: id, error: err });
  }

  return NextResponse.json({
    success: true,
    order: normalized,
    message: "Order marked as delivered"
  });
}
