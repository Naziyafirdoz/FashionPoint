import { NextResponse } from "next/server";
import { requireWorkerStaff } from "@/lib/admin/require-staff";
import { isAssignedPackingWorkerOnly } from "@/lib/admin/staff";
import { normalizeOrderRecord } from "@/lib/orders/normalize-order";
import { assertTransition } from "@/lib/orders/workflow-validation";
import { cancelOrderReminders } from "@/lib/server/notifications/order-reminders";
import { notifyAdminWorkerPacked } from "@/lib/server/notifications/new-order-alerts";
import type { Order } from "@/types";
import type { StaffRole } from "@/lib/admin/require-staff";

type RouteContext = { params: Promise<{ id: string }> };

async function loadWorkerOrder(
  db: import("@supabase/supabase-js").SupabaseClient,
  orderId: string,
  userId: string,
  roles: StaffRole[]
) {
  const { data } = await db.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (!data) return { error: NextResponse.json({ error: "Order not found" }, { status: 404 }) };
  const order = data as Order;
  if (isAssignedPackingWorkerOnly(roles) && order.assigned_worker_id !== userId) {
    return { error: NextResponse.json({ error: "Order not assigned to you" }, { status: 403 }) };
  }
  return { order };
}

export async function POST(_req: Request, { params }: RouteContext) {
  const auth = await requireWorkerStaff();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const loaded = await loadWorkerOrder(auth.ctx.db, id, auth.ctx.userId, auth.ctx.roles);
  if ("error" in loaded && loaded.error) return loaded.error;
  const order = loaded.order!;

  const transitionError = assertTransition(order.status as string, "packed");
  if (transitionError) {
    return NextResponse.json({ error: transitionError }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await auth.ctx.db
    .from("orders")
    .update({ status: "packed", packed_at: now, updated_at: now })
    .eq("id", id)
    .eq("status", "packing_assigned")
    .select("*")
    .maybeSingle();

  if (error || !updated) {
    return NextResponse.json({ error: "Unable to mark packed" }, { status: 500 });
  }

  await cancelOrderReminders(auth.ctx.db, id, "worker", auth.ctx.userId);

  const normalized = await normalizeOrderRecord(auth.ctx.db, updated as Order, { persist: false });
  await notifyAdminWorkerPacked(auth.ctx.db, normalized);

  return NextResponse.json({ success: true, order: normalized, message: "Order marked packed" });
}
