import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/admin/require-staff";
import { normalizeOrderRecord } from "@/lib/orders/normalize-order";
import { assertTransition } from "@/lib/orders/workflow-validation";
import { normalizeLegacyStatus } from "@/lib/orders/status-config";
import { notifyAdminWorkerPacked } from "@/lib/server/notifications/new-order-alerts";
import type { Order } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

const isDev = process.env.NODE_ENV === "development";

function isPackedAtSchemaError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "PGRST204" ||
    error.code === "42703" ||
    msg.includes("packed_at") ||
    (msg.includes("schema cache") && msg.includes("packed"))
  );
}

/**
 * Admin Mark Packed — same fulfillment step as worker `/api/worker/orders/[id]/packed`.
 * packing_assigned → packed (does NOT skip to ready_to_ship).
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
    return NextResponse.json({ error: "Unable to load order" }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const status = normalizeLegacyStatus(existing.status as string);
  if (status !== "packing_assigned") {
    return NextResponse.json(
      { error: "Only orders in packing can be marked packed" },
      { status: 400 }
    );
  }

  const transitionError = assertTransition(existing.status as string, "packed");
  if (transitionError) {
    return NextResponse.json({ error: transitionError }, { status: 400 });
  }

  const now = new Date().toISOString();
  let updatePayload: Record<string, unknown> = {
    status: "packed",
    packed_at: now,
    updated_at: now
  };

  let { data: updated, error } = await auth.ctx.db
    .from("orders")
    .update(updatePayload)
    .eq("id", id)
    .eq("status", "packing_assigned")
    .select("*")
    .maybeSingle();

  if (error && isPackedAtSchemaError(error)) {
    if (isDev) {
      console.warn("[pack-order] retry without packed_at", { orderId: id, error });
    }
    updatePayload = { status: "packed", updated_at: now };
    const retry = await auth.ctx.db
      .from("orders")
      .update(updatePayload)
      .eq("id", id)
      .eq("status", "packing_assigned")
      .select("*")
      .maybeSingle();
    updated = retry.data;
    error = retry.error;
  }

  if (error) {
    if (isDev) {
      console.error("[pack-order] supabaseError", { orderId: id, updatePayload, error });
    }
    return NextResponse.json(
      { error: isDev ? error.message : "Unable to pack order" },
      { status: 500 }
    );
  }

  if (!updated) {
    return NextResponse.json(
      { error: "Order could not be marked packed — status may have changed" },
      { status: 409 }
    );
  }

  const normalized = await normalizeOrderRecord(auth.ctx.db, updated as Order, { persist: false });

  try {
    await notifyAdminWorkerPacked(auth.ctx.db, normalized);
  } catch (err) {
    console.error("[pack-order] notifications failed", { orderId: id, error: err });
  }

  return NextResponse.json({
    success: true,
    order: normalized,
    message: "Order marked packed"
  });
}
