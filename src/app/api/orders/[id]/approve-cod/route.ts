import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { normalizeOrderRecord } from "@/lib/orders/normalize-order";
import type { Order } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * LEGACY COD approval path (`cod_verification` status).
 * Checkout rejects COD; prepaid flow does not use this route.
 * Retained so historical COD rows can still be handled if present in DB.
 */
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

  if ((order.status as string) !== "cod_verification") {
    return NextResponse.json({ error: "Only COD verification orders can be approved" }, { status: 400 });
  }

  if (order.payment_method !== "cod") {
    return NextResponse.json({ error: "Not a COD order" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await auth.ctx.db
    .from("orders")
    .update({
      status: "processing",
      updated_at: now
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Unable to approve COD order" }, { status: 500 });
  }

  const normalized = await normalizeOrderRecord(auth.ctx.db, updated as Order, { persist: false });

  return NextResponse.json({ success: true, order: normalized });
}
