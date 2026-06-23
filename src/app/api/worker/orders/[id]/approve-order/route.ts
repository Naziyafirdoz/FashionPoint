import { NextResponse } from "next/server";
import { requireWorkerStaff } from "@/lib/admin/require-staff";
import { executeOrderApproval } from "@/lib/server/order-actions/approve";
import { getRequestMeta } from "@/lib/server/order-actions/request-meta";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteContext) {
  const auth = await requireWorkerStaff();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const meta = getRequestMeta(req);
  const result = await executeOrderApproval(auth.ctx.db, id, {
    performedBy: auth.ctx.userId,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent
  });

  if (result.ok) {
    return NextResponse.json({
      success: true,
      order: result.order,
      message: result.status === "already_approved" ? "Order has already been approved." : "Order confirmed"
    });
  }

  if (result.status === "not_found") {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (result.status === "not_awaiting") {
    return NextResponse.json({ error: "Only pending orders can be approved" }, { status: 400 });
  }

  return NextResponse.json({ error: result.message ?? "Unable to approve order" }, { status: 500 });
}
