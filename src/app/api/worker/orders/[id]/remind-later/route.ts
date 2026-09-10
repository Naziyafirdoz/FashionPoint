import { NextResponse } from "next/server";
import { requireWorkerStaff } from "@/lib/admin/require-staff";
import { isAssignedPackingWorkerOnly } from "@/lib/admin/staff";
import { workerReminderIntervalHours } from "@/lib/orders/fulfillment-workflow";
import { scheduleOrderReminder } from "@/lib/server/notifications/order-reminders";
import type { Order } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteContext) {
  const auth = await requireWorkerStaff();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const hours = Number(body.hours ?? 0);

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

  if ((order.status as string) !== "packing_assigned") {
    return NextResponse.json({ error: "Reminders only apply while packing is assigned" }, { status: 400 });
  }

  const intervalHours = hours > 0 ? hours : workerReminderIntervalHours(order);
  const scheduled = await scheduleOrderReminder(auth.ctx.db, {
    orderId: id,
    audience: "worker",
    intervalHours,
    workerId: auth.ctx.userId
  });

  if (!scheduled.ok) {
    return NextResponse.json({ error: scheduled.error }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    remindAt: scheduled.remindAt,
    message: `Reminder scheduled in ${intervalHours} hour(s)`
  });
}
