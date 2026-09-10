import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/admin/require-staff";
import { normalizeOrderRecord } from "@/lib/orders/normalize-order";
import { assertTransition } from "@/lib/orders/workflow-validation";
import { normalizeLegacyStatus } from "@/lib/orders/status-config";
import { notifyAdminReadyForDispatch } from "@/lib/server/notifications/new-order-alerts";
import type { Order } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Ready For Shipping: confirmed|packed → ready_to_ship.
 * Main path: confirmed → ready_to_ship (after approval often already ready).
 * Legacy packing: packed → ready_to_ship.
 * delivery_worker is not allowed.
 */
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
    console.error("[ready-for-shipping route] error", fetchError.message);
    return NextResponse.json({ error: "Unable to load order" }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const status = existing.status as string;
  const normalized = normalizeLegacyStatus(status);
  if (normalized !== "packed" && normalized !== "confirmed") {
    return NextResponse.json(
      { error: "Only confirmed or packed orders can be marked ready for shipping" },
      { status: 400 }
    );
  }

  const transitionError = assertTransition(status, "ready_to_ship");
  if (transitionError) {
    return NextResponse.json({ error: transitionError }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await auth.ctx.db
    .from("orders")
    .update({
      status: "ready_to_ship",
      updated_at: now
    })
    .eq("id", id)
    .eq("status", status)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[ready-for-shipping route] update failed", { orderId: id, message: error.message });
    return NextResponse.json({ error: "Unable to mark ready for shipping" }, { status: 500 });
  }

  if (!updated) {
    return NextResponse.json(
      { error: "Ready for shipping could not be saved — order status may have changed" },
      { status: 409 }
    );
  }

  const normalizedOrder = await normalizeOrderRecord(auth.ctx.db, updated as Order, {
    persist: false
  });

  try {
    await notifyAdminReadyForDispatch(auth.ctx.db, normalizedOrder);
  } catch (err) {
    console.error("[ready-for-shipping] staff notifications failed", { orderId: id, error: err });
  }

  // Ready-for-shipment is status/UI only for all fulfillment methods.
  // Customer lifecycle emails start at shipping (Rapido/DTDC) or OFD (Delivery Staff).

  return NextResponse.json({
    success: true,
    order: normalizedOrder,
    message: "Order marked ready for shipping"
  });
}
