import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { normalizeOrderRecord } from "@/lib/orders/normalize-order";
import { assertTransition } from "@/lib/orders/workflow-validation";
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
  const rawStatus = order.status as string;
  const fromStatus = rawStatus === "cod_verification" ? "processing" : order.status;
  const transitionError = assertTransition(fromStatus, "processing");
  if (transitionError) {
    return NextResponse.json({ error: transitionError }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await auth.ctx.db
    .from("orders")
    .update({ status: "processing", updated_at: now })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Unable to start processing" }, { status: 500 });
  }

  const normalized = await normalizeOrderRecord(auth.ctx.db, updated as Order, { persist: false });

  return NextResponse.json({
    success: true,
    order: normalized,
    message: "Order moved to processing"
  });
}
