import { NextResponse } from "next/server";
import { requireWorkerStaff } from "@/lib/admin/require-staff";
import { isOwnerOrAdmin } from "@/lib/admin/staff";
import { executeOrderApproval } from "@/lib/server/order-actions/approve";
import { getRequestMeta } from "@/lib/server/order-actions/request-meta";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Prefer `/api/admin/orders/[id]/approve-order`.
 * Workers are forbidden from approving. Owner/admin may still use this path.
 */
export async function POST(req: Request, { params }: RouteContext) {
  const auth = await requireWorkerStaff();
  if (!auth.ok) return auth.response;

  if (!isOwnerOrAdmin(auth.ctx.roles)) {
    return NextResponse.json(
      { error: "Workers cannot approve orders. Ask an admin to approve." },
      { status: 403 }
    );
  }

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
