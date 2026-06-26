import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase";
import { isAdminUser } from "@/lib/auth/helpers";
import { normalizeOrderRecord } from "@/lib/orders/normalize-order";
import { customerShippedMessage } from "@/lib/orders/fulfillment-workflow";
import { getAvailableShippingOptionalColumns } from "@/lib/orders/shipping-schema";
import { assertTransition } from "@/lib/orders/workflow-validation";
import { normalizeLegacyStatus } from "@/lib/orders/status-config";
import {
  notifyAdminOrderShipped,
  notifyCustomerOrderShipped
} from "@/lib/server/notifications/new-order-alerts";
import { invalidateAdminDataCaches } from "@/lib/admin/invalidate-admin-caches";
import type { Order } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: RouteContext) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  console.info("[mark-shipped] user id", user?.id ?? "(none)", userError?.message ?? "");

  if (!user) {
    console.info("[mark-shipped] error", "unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = await isAdminUser(user.id);
  console.info("[mark-shipped] isAdmin", isAdmin);

  if (!isAdmin) {
    console.info("[mark-shipped] error", "forbidden — not in admin_users");
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = createServiceClient();
  if (!db) {
    console.info("[mark-shipped] error", "database not configured");
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  const { id } = await params;
  const { data: existing, error: fetchError } = await db
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    console.error("[mark-shipped] error", fetchError.message);
    return NextResponse.json({ error: "Unable to load order" }, { status: 500 });
  }
  if (!existing) {
    console.info("[mark-shipped] error", "order not found", id);
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const status = existing.status as string;
  console.info("[mark-shipped] current status", status);

  if (normalizeLegacyStatus(status) !== "ready_to_ship") {
    console.info("[mark-shipped] error", "status is not ready_to_ship", status);
    return NextResponse.json(
      { error: "Only ready for shipping orders can be marked shipped" },
      { status: 400 }
    );
  }

  const transitionError = assertTransition(status, "shipped");
  if (transitionError) {
    console.info("[mark-shipped] error", transitionError);
    return NextResponse.json({ error: transitionError }, { status: 400 });
  }

  const now = new Date().toISOString();
  const optionalColumns = await getAvailableShippingOptionalColumns(db);
  const payload: Record<string, unknown> = {
    status: "shipped",
    updated_at: now
  };
  if (optionalColumns.has("shipping_date")) {
    payload.shipping_date = now;
  }

  const { data: updated, error } = await db
    .from("orders")
    .update(payload)
    .eq("id", id)
    .eq("status", "ready_to_ship")
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[mark-shipped] error", error.message);
    return NextResponse.json({ error: "Unable to mark order as shipped" }, { status: 500 });
  }

  if (!updated) {
    console.error("[mark-shipped] rows updated", 0);
    const { data: current } = await db.from("orders").select("status").eq("id", id).maybeSingle();
    console.info("[mark-shipped] current status after failed update", current?.status);
    return NextResponse.json(
      { error: "Order could not be marked shipped — status may have changed" },
      { status: 409 }
    );
  }

  console.info("[mark-shipped] rows updated", 1);

  const normalized = await normalizeOrderRecord(db, updated as Order, { persist: false });
  console.info("[mark-shipped] success", {
    orderId: id,
    orderNumber: normalized.order_number,
    status: normalized.status
  });

  invalidateAdminDataCaches();

  try {
    const shippedMessage = customerShippedMessage(normalized);
    await notifyCustomerOrderShipped(normalized, shippedMessage);
    await notifyAdminOrderShipped(db, normalized);
  } catch (err) {
    console.error("[mark-shipped] notifications failed", { orderId: id, error: err });
  }

  return NextResponse.json({
    success: true,
    order: normalized,
    message: "Order marked as shipped"
  });
}
