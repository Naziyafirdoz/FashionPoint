import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase";
import { isAdminUser } from "@/lib/auth/helpers";
import { normalizeOrderRecord } from "@/lib/orders/normalize-order";
import { assertTransition } from "@/lib/orders/workflow-validation";
import { normalizeLegacyStatus } from "@/lib/orders/status-config";
import { notifyAdminReadyForDispatch } from "@/lib/server/notifications/new-order-alerts";
import type { Order } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: RouteContext) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  console.info("[ready-for-shipping route] user id", user?.id ?? "(none)", userError?.message ?? "");

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = await isAdminUser(user.id);
  console.info("[ready-for-shipping route] admin check result", admin);

  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = createServiceClient();
  if (!db) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  const { id } = await params;
  const { data: existing, error: fetchError } = await db
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
  console.info("[ready-for-shipping route] current status", status);

  if (normalizeLegacyStatus(status) !== "packing_assigned") {
    return NextResponse.json(
      { error: "Only packing orders can be marked ready for shipping" },
      { status: 400 }
    );
  }

  const transitionError = assertTransition(status, "ready_to_ship");
  if (transitionError) {
    return NextResponse.json({ error: transitionError }, { status: 400 });
  }

  console.info(
    "[ready-for-shipping route] attempting transition packing_assigned -> ready_for_shipping"
  );

  const now = new Date().toISOString();
  const { data: updated, error } = await db
    .from("orders")
    .update({
      status: "ready_to_ship",
      updated_at: now
    })
    .eq("id", id)
    .eq("status", "packing_assigned")
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[ready-for-shipping route] update failed", { orderId: id, message: error.message });
    return NextResponse.json({ error: "Unable to mark ready for shipping" }, { status: 500 });
  }

  if (!updated) {
    console.error("[ready-for-shipping route] rows updated", 0);
    return NextResponse.json(
      { error: "Ready for shipping could not be saved — order status may have changed" },
      { status: 409 }
    );
  }

  console.info("[ready-for-shipping route] rows updated", 1);

  const normalized = await normalizeOrderRecord(db, updated as Order, { persist: false });

  try {
    await notifyAdminReadyForDispatch(db, normalized);
  } catch (err) {
    console.error("[ready-for-shipping] staff notifications failed", { orderId: id, error: err });
  }

  return NextResponse.json({
    success: true,
    order: normalized,
    message: "Order marked ready for shipping"
  });
}
