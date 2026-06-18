import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { canAdminRejectCancellation, buildRejectCancellationPayload } from "@/lib/orders/manual-refund";
import { normalizeOrderRecord, persistOrderUpdate } from "@/lib/orders/normalize-order";
import type { Order } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const { data: existing, error: fetchError } = await auth.ctx.db
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: "Unable to load order" }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const order = existing as Order;
  if (!canAdminRejectCancellation(order)) {
    return NextResponse.json({ error: "This cancellation request cannot be rejected" }, { status: 400 });
  }

  const { order: updated, error } = await persistOrderUpdate(
    auth.ctx.db,
    id,
    buildRejectCancellationPayload()
  );

  if (error || !updated) {
    return NextResponse.json({ error: error ?? "Unable to reject cancellation" }, { status: 500 });
  }

  const normalized = await normalizeOrderRecord(auth.ctx.db, updated, { persist: true });
  return NextResponse.json({ success: true, order: normalized });
}
