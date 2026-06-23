import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/admin/require-staff";
import { executeOrderRemindLater } from "@/lib/server/order-actions/remind";
import { getRequestMeta } from "@/lib/server/order-actions/request-meta";
import { formatReminderDelayLabel } from "@/lib/server/notifications/reminder-config";
import {
  htmlResponse,
  renderAlreadyApprovedPage,
  renderInvalidTokenPage,
  renderRemindErrorPage,
  renderRemindScheduledPage,
  renderRemindSkippedPage
} from "@/lib/server/notifications/email-action-pages";

type RouteContext = { params: Promise<{ id: string }> };

async function handleRemind(req: Request, id: string, viaEmail: boolean) {
  const auth = await requireStaff(["owner", "admin", "worker"]);
  if (!auth.ok) {
    if (viaEmail) return htmlResponse(renderInvalidTokenPage());
    return auth.response;
  }

  const meta = getRequestMeta(req);
  const result = await executeOrderRemindLater(auth.ctx.db, id, {
    performedBy: auth.ctx.userId,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent
  });

  if (result.ok && result.status === "already_approved") {
    if (viaEmail) return htmlResponse(renderAlreadyApprovedPage(result.order.order_number));
    return NextResponse.json({ error: "Order has already been approved." }, { status: 400 });
  }

  if (result.ok && result.status === "scheduled") {
    if (viaEmail) {
      return htmlResponse(
        renderRemindScheduledPage(result.order.order_number, result.remindAt, result.order.id)
      );
    }
    return NextResponse.json({
      success: true,
      remindAt: result.remindAt,
      message: `Reminder scheduled in ${formatReminderDelayLabel()}`
    });
  }

  if (result.ok === false && result.status === "not_found") {
    if (viaEmail) return htmlResponse(renderRemindErrorPage(id));
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (result.ok === false && result.status === "not_awaiting") {
    if (viaEmail) return htmlResponse(renderRemindSkippedPage("", id));
    return NextResponse.json({ error: "Reminders only apply to pending orders" }, { status: 400 });
  }

  if (viaEmail) return htmlResponse(renderRemindErrorPage(id));
  return NextResponse.json(
    { error: result.ok === false ? result.message ?? "Unable to schedule reminder" : "Unable to schedule reminder" },
    { status: 500 }
  );
}

export async function POST(req: Request, { params }: RouteContext) {
  const { id } = await params;
  return handleRemind(req, id, false);
}

/** Legacy email link — prefer tokenized /api/order-actions/remind */
export async function GET(req: Request, { params }: RouteContext) {
  const { id } = await params;
  const url = new URL(req.url);
  if (url.searchParams.get("via") !== "email" && url.searchParams.get("action") !== "remind") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  return handleRemind(req, id, true);
}
