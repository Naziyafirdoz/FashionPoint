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

  if ((order.status as string) !== "shipped") {
    return NextResponse.json({ error: "Only shipped orders can be marked out for delivery" }, { status: 400 });
  }

  // Courier (Rapido/DTDC) orders end at shipped — cannot move to out_for_delivery.
  if (order.fulfillment_method === "rapido" || order.fulfillment_method === "dtdc") {
    return NextResponse.json(
      { error: "Rapido and DTDC orders cannot be marked out for delivery." },
      { status: 400 }
    );
  }

  const transitionError = assertTransition(order.status as string, "out_for_delivery");
  if (transitionError) {
    return NextResponse.json({ error: transitionError }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await auth.ctx.db
    .from("orders")
    .update({ status: "out_for_delivery", updated_at: now })
    .eq("id", id)
    .eq("status", "shipped")
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Unable to update order" }, { status: 500 });
  }

  const normalized = await normalizeOrderRecord(auth.ctx.db, updated as Order, { persist: false });

  return NextResponse.json({
    success: true,
    order: normalized,
    message: "Order marked out for delivery. Customer notification can be sent when SMS/email is connected."
  });
}
