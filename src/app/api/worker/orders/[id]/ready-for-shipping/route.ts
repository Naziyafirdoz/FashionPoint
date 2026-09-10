import { NextResponse } from "next/server";
import { requireWorkerStaff } from "@/lib/admin/require-staff";
import { isAssignedPackingWorkerOnly } from "@/lib/admin/staff";
import { normalizeOrderRecord } from "@/lib/orders/normalize-order";
import { assertTransition } from "@/lib/orders/workflow-validation";
import { cancelOrderReminders } from "@/lib/server/notifications/order-reminders";
import { notifyAdminReadyForDispatch } from "@/lib/server/notifications/new-order-alerts";
import type { Order } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: RouteContext) {
  const auth = await requireWorkerStaff();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const { data: existing } = await auth.ctx.db.from("orders").select("*").eq("id", id).maybeSingle();
  if (!existing) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const order = existing as Order;
  if (
    isAssignedPackingWorkerOnly(auth.ctx.roles) &&
    order.assigned_worker_id !== auth.ctx.userId
  ) {
    return NextResponse.json({ error: "Order not assigned to you" }, { status: 403 });
  }

  const transitionError = assertTransition(order.status as string, "ready_to_ship");
  if (transitionError) {
    return NextResponse.json({ error: transitionError }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await auth.ctx.db
    .from("orders")
    .update({ status: "ready_to_ship", updated_at: now })
    .eq("id", id)
    .eq("status", "packed")
    .select("*")
    .maybeSingle();

  if (error || !updated) {
    return NextResponse.json({ error: "Unable to mark ready for shipping" }, { status: 500 });
  }

  await cancelOrderReminders(auth.ctx.db, id, "worker", auth.ctx.userId);

  const normalized = await normalizeOrderRecord(auth.ctx.db, updated as Order, { persist: false });
  await notifyAdminReadyForDispatch(auth.ctx.db, normalized);

  return NextResponse.json({
    success: true,
    order: normalized,
    message: "Order ready for shipping"
  });
}
