import { NextResponse } from "next/server";
import { requireAdminStaff } from "@/lib/admin/require-staff";
import { isAwaitingOrderApproval } from "@/lib/orders/fulfillment-workflow";
import {
  htmlResponse,
  renderApproveSuccessPage,
  renderRemindErrorPage,
  renderRemindScheduledPage,
  renderRemindSkippedPage
} from "@/lib/server/notifications/email-action-pages";
import { scheduleAdminApprovalReminder } from "@/lib/server/notifications/admin-approval-reminders";
import { formatReminderDelayLabel } from "@/lib/server/notifications/reminder-config";
import type { Order } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

async function handleRemind(req: Request, id: string) {
  const auth = await requireAdminStaff();
  if (!auth.ok) return auth.response;

  const viaEmail = new URL(req.url).searchParams.get("via") === "email";

  const { data: existing } = await auth.ctx.db.from("orders").select("*").eq("id", id).maybeSingle();
  if (!existing) {
    console.warn("[remind-later] order not found", { orderId: id });
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const order = existing as Order;
  if (!isAwaitingOrderApproval(order.status as string)) {
    console.info("[remind-later] skipped — not awaiting approval", {
      orderId: id,
      status: order.status
    });
    if (viaEmail) {
      return htmlResponse(renderRemindSkippedPage(order.order_number, id));
    }
    return NextResponse.json({ error: "Reminders only apply to pending orders" }, { status: 400 });
  }

  const scheduled = await scheduleAdminApprovalReminder(auth.ctx.db, order);

  if (!scheduled.ok) {
    console.error("[remind-later] schedule failed", { orderId: id, error: scheduled.error });
    if (viaEmail) {
      return htmlResponse(renderRemindErrorPage(id));
    }
    return NextResponse.json({ error: scheduled.error }, { status: 500 });
  }

  console.info("[remind-later] scheduled", {
    orderId: id,
    orderNumber: order.order_number,
    remindAt: scheduled.remindAt,
    delayMinutes: process.env.REMINDER_DELAY_MINUTES ?? "120(default)"
  });

  if (viaEmail) {
    return htmlResponse(renderRemindScheduledPage(order.order_number, scheduled.remindAt, id));
  }

  return NextResponse.json({
    success: true,
    remindAt: scheduled.remindAt,
    message: `Reminder scheduled in ${formatReminderDelayLabel()}`
  });
}

export async function POST(req: Request, { params }: RouteContext) {
  const { id } = await params;
  return handleRemind(req, id);
}

/** Email link handler: schedules reminder without approving. */
export async function GET(req: Request, { params }: RouteContext) {
  const { id } = await params;
  const url = new URL(req.url);
  if (url.searchParams.get("via") !== "email" && url.searchParams.get("action") !== "remind") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  return handleRemind(req, id);
}
