import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/admin/require-staff";
import { normalizeOrderRecord } from "@/lib/orders/normalize-order";
import { assertTransition } from "@/lib/orders/workflow-validation";
import { normalizeLegacyStatus } from "@/lib/orders/status-config";
import type { Order } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

/** Legacy packing start — owner/admin/packing worker only (not delivery_worker). */
export async function POST(_req: Request, { params }: RouteContext) {
  const auth = await requireStaff(["owner", "admin", "worker"]);
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

  const status = existing.status as string;
  if (normalizeLegacyStatus(status) !== "confirmed") {
    return NextResponse.json(
      { error: "Only confirmed orders can start packing" },
      { status: 400 }
    );
  }

  const transitionError = assertTransition(status, "packing_assigned");
  if (transitionError) {
    return NextResponse.json({ error: transitionError }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await auth.ctx.db
    .from("orders")
    .update({
      status: "packing_assigned",
      updated_at: now
    })
    .eq("id", id)
    .eq("status", status)
    .select("*")
    .maybeSingle();

  if (error || !updated) {
    return NextResponse.json({ error: "Unable to start packing" }, { status: 500 });
  }

  const normalized = await normalizeOrderRecord(auth.ctx.db, updated as Order, { persist: false });
  return NextResponse.json({
    success: true,
    order: normalized,
    message: "Packing started"
  });
}
