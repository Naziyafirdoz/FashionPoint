import { NextResponse } from "next/server";
import { requireWorkerStaff } from "@/lib/admin/require-staff";
import { isAssignedPackingWorkerOnly } from "@/lib/admin/staff";
import type { Order } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

/** Acknowledge packing is still in progress — no status change. */
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

  return NextResponse.json({ success: true, message: "Order remains pending packing" });
}
