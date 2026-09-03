import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/admin/require-staff";
import { executeOrderApproval } from "@/lib/server/order-actions/approve";
import { getRequestMeta } from "@/lib/server/order-actions/request-meta";
import {
  htmlResponse,
  renderAlreadyApprovedPage,
  renderApproveSuccessPage,
  renderInvalidTokenPage
} from "@/lib/server/notifications/email-action-pages";

type RouteContext = { params: Promise<{ id: string }> };

async function approveOrder(req: Request, id: string, viaEmail: boolean) {
  const auth = await requireStaff(["owner", "admin", "worker"]);
  if (!auth.ok) {
    if (viaEmail) return { response: htmlResponse(await renderInvalidTokenPage()) };
    return { response: auth.response as NextResponse };
  }

  const meta = getRequestMeta(req);
  const result = await executeOrderApproval(auth.ctx.db, id, {
    performedBy: auth.ctx.userId,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent
  });

  if (result.ok && result.status === "already_approved") {
    if (viaEmail) {
      return { response: htmlResponse(await renderAlreadyApprovedPage(result.order.order_number)) };
    }
    return {
      response: NextResponse.json({
        success: true,
        order: result.order,
        message: "Order has already been approved."
      })
    };
  }

  if (result.ok && result.status === "approved") {
    if (viaEmail) {
      return {
        response: htmlResponse(await renderApproveSuccessPage(result.order.order_number, result.order.id))
      };
    }
    return {
      response: NextResponse.json({
        success: true,
        order: result.order,
        message: "Order confirmed"
      })
    };
  }

  if (viaEmail) {
    return {
      response: htmlResponse(
        `<!DOCTYPE html><html><body style="font-family:system-ui;padding:24px;"><p>Order could not be approved.</p></body></html>`
      )
    };
  }

  if (result.ok === false && result.status === "not_found") {
    return { response: NextResponse.json({ error: "Order not found" }, { status: 404 }) };
  }

  if (result.ok === false && result.status === "not_awaiting") {
    return { response: NextResponse.json({ error: "Only pending orders can be approved" }, { status: 400 }) };
  }

  return {
    response: NextResponse.json(
      { error: result.ok === false ? result.message ?? "Unable to approve order" : "Unable to approve order" },
      { status: result.ok === false && result.status === "conflict" ? 409 : 500 }
    )
  };
}

export async function POST(req: Request, { params }: RouteContext) {
  const { id } = await params;
  const result = await approveOrder(req, id, false);
  return result.response;
}

/** Legacy email link — prefer tokenized /api/order-actions/approve */
export async function GET(req: Request, { params }: RouteContext) {
  const { id } = await params;
  const url = new URL(req.url);
  if (url.searchParams.get("via") !== "email") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const result = await approveOrder(req, id, true);
  return result.response;
}
