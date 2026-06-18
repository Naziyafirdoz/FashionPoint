import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { normalizeOrderRecord } from "@/lib/orders/normalize-order";
import type { Order } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const otp = typeof body.otp === "string" ? body.otp.trim() : "";

  if (!otp) {
    return NextResponse.json({ error: "Delivery OTP is required" }, { status: 400 });
  }

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

  if (order.status !== "out_for_delivery") {
    return NextResponse.json(
      { error: "Order must be out for delivery before OTP verification" },
      { status: 400 }
    );
  }

  if (!order.delivery_otp) {
    return NextResponse.json(
      {
        error: "No delivery OTP on file. Mark as delivered manually.",
        fallback_manual: true
      },
      { status: 400 }
    );
  }

  if (order.delivery_otp !== otp) {
    return NextResponse.json({ error: "Invalid delivery OTP" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await auth.ctx.db
    .from("orders")
    .update({
      status: "delivered",
      otp_verified_at: now,
      delivery_confirmed_at: now,
      updated_at: now
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Unable to confirm delivery" }, { status: 500 });
  }

  const normalized = await normalizeOrderRecord(auth.ctx.db, updated as Order, { persist: false });

  return NextResponse.json({ success: true, order: normalized });
}
