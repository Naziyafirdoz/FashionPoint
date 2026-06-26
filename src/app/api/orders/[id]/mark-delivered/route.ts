import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/admin/require-staff";
import { normalizeOrderRecord } from "@/lib/orders/normalize-order";
import { processDeliveredNotification } from "@/lib/server/notifications/delivered-route-handler";
import { assertTransition } from "@/lib/orders/workflow-validation";
import { invalidateAdminDataCaches } from "@/lib/admin/invalidate-admin-caches";
import type { Order } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: RouteContext) {
  const auth = await requireStaff(["owner", "admin", "worker"]);
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

  const status = existing.status as string;
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
