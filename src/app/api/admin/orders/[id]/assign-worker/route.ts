import { NextResponse } from "next/server";
import { requireAdminStaff } from "@/lib/admin/require-staff";
import { notifyAdminPackingAssigned } from "@/lib/server/notifications/new-order-alerts";
import { normalizeOrderRecord } from "@/lib/orders/normalize-order";
import { assertTransition } from "@/lib/orders/workflow-validation";
import type { Order } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteContext) {
  const auth = await requireAdminStaff();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const workerId = typeof body.worker_id === "string" ? body.worker_id.trim() : "";

  if (!workerId) {
    return NextResponse.json({ error: "worker_id is required" }, { status: 400 });
  }

  const { data: worker } = await auth.ctx.db
    .from("admin_users")
    .select("user_id, role")
    .eq("user_id", workerId)
    .maybeSingle();

  if (!worker || (worker.role as string)?.toLowerCase() !== "worker") {
    return NextResponse.json({ error: "Invalid worker" }, { status: 400 });
  }

  const { data: existing } = await auth.ctx.db.from("orders").select("*").eq("id", id).maybeSingle();
  if (!existing) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const order = existing as Order;
  const fromStatus = order.status as string;
  const transitionError = assertTransition(fromStatus, "packing_assigned");
  if (transitionError && fromStatus !== "packing_assigned") {
    return NextResponse.json({ error: transitionError }, { status: 400 });
  }

  if (fromStatus === "packing_assigned" && order.assigned_worker_id === workerId) {
    const normalized = await normalizeOrderRecord(auth.ctx.db, order, { persist: false });
    return NextResponse.json({ success: true, order: normalized, message: "Already assigned" });
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await auth.ctx.db
    .from("orders")
    .update({
      status: "packing_assigned",
      assigned_worker_id: workerId,
      assigned_at: now,
      updated_at: now
    })
    .eq("id", id)
    .in("status", ["confirmed", "processing", "packing_assigned"])
    .select("*")
    .maybeSingle();

  if (error || !updated) {
    return NextResponse.json({ error: "Unable to assign worker" }, { status: 500 });
  }

  const normalized = await normalizeOrderRecord(auth.ctx.db, updated as Order, { persist: false });
  if (fromStatus !== "packing_assigned") {
    await notifyAdminPackingAssigned(auth.ctx.db, normalized);
  }
  return NextResponse.json({ success: true, order: normalized, message: "Worker assigned" });
}
