import { NextResponse } from "next/server";
import { requireAdminStaff } from "@/lib/admin/require-staff";
import { normalizeOrderRecord } from "@/lib/orders/normalize-order";
import {
  assertFulfillmentMethodAllowed,
  courierLabelForMethod,
  isFulfillmentMethod,
  isShipmentStatusLocked,
  SHIPMENT_LOCKED_ERROR,
  type FulfillmentMethod
} from "@/lib/orders/fulfillment-method";
import { getAvailableFulfillmentColumns } from "@/lib/orders/fulfillment-schema";
import { getAvailableShippingOptionalColumns } from "@/lib/orders/shipping-schema";
import { customerShippedMessage } from "@/lib/orders/fulfillment-workflow";
import { assertTransition } from "@/lib/orders/workflow-validation";
import { normalizeLegacyStatus } from "@/lib/orders/status-config";
import {
  notifyAdminOrderShipped,
  notifyCustomerOrderShipped
} from "@/lib/server/notifications/new-order-alerts";
import { invalidateAdminDataCaches } from "@/lib/admin/invalidate-admin-caches";
import type { Order } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Courier dispatch (Rapido local / DTDC outstation).
 * Body: { fulfillment_method: "rapido"|"dtdc", tracking_number?: string }
 * DTDC requires tracking_number.
 */
export async function POST(req: Request, { params }: RouteContext) {
  const auth = await requireAdminStaff();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const methodRaw = body.fulfillment_method;
  const tracking =
    typeof body.tracking_number === "string" ? body.tracking_number.trim() : "";

  if (!isFulfillmentMethod(methodRaw) || (methodRaw !== "rapido" && methodRaw !== "dtdc")) {
    return NextResponse.json(
      { error: "fulfillment_method must be rapido or dtdc" },
      { status: 400 }
    );
  }
  const method = methodRaw as Extract<FulfillmentMethod, "rapido" | "dtdc">;

  if (method === "dtdc" && !tracking) {
    return NextResponse.json(
      { error: "DTDC Tracking Number is required." },
      { status: 400 }
    );
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
  const currentStatus = normalizeLegacyStatus(order.status);

  // Shipment confirmation is one-shot: method + tracking + Rapido details lock after shipped.
  if (isShipmentStatusLocked(currentStatus)) {
    return NextResponse.json({ error: SHIPMENT_LOCKED_ERROR }, { status: 409 });
  }

  if (currentStatus !== "ready_to_ship") {
    return NextResponse.json(
      { error: "Only ready for shipping orders can be marked shipped" },
      { status: 400 }
    );
  }

  const transitionError = assertTransition(order.status, "shipped");
  if (transitionError) {
    return NextResponse.json({ error: transitionError }, { status: 400 });
  }

  const allowed = await assertFulfillmentMethodAllowed(order, method);
  if (!allowed.ok) {
    return NextResponse.json({ error: allowed.error }, { status: 400 });
  }

  const courierName = courierLabelForMethod(method);
  const now = new Date().toISOString();
  const optionalColumns = await getAvailableShippingOptionalColumns(auth.ctx.db);
  const fulfillmentColumns = await getAvailableFulfillmentColumns(auth.ctx.db);

  const payload: Record<string, unknown> = {
    status: "shipped",
    updated_at: now,
    courier_name: courierName
  };
  if (tracking) {
    payload.tracking_id = tracking;
  }
  if (optionalColumns.has("tracking_number") && tracking) {
    payload.tracking_number = tracking;
  }
  if (optionalColumns.has("courier_partner")) {
    payload.courier_partner = courierName;
  }
  if (optionalColumns.has("delivery_partner")) {
    payload.delivery_partner = courierName;
  }
  if (optionalColumns.has("shipping_date")) {
    payload.shipping_date = now;
  }
  if (fulfillmentColumns.has("fulfillment_method")) {
    payload.fulfillment_method = method;
  }
  if (fulfillmentColumns.has("fulfillment_zone")) {
    payload.fulfillment_zone = allowed.zone;
  }

  const { data: updated, error } = await auth.ctx.db
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
    return NextResponse.json({ error: SHIPMENT_LOCKED_ERROR }, { status: 409 });
  }

  const normalized = await normalizeOrderRecord(auth.ctx.db, updated as Order, { persist: false });
  invalidateAdminDataCaches();

  try {
    const shippedMessage = customerShippedMessage(normalized);
    await notifyCustomerOrderShipped(normalized, shippedMessage);
    await notifyAdminOrderShipped(auth.ctx.db, normalized);
  } catch (err) {
    console.error("[mark-shipped] notifications failed", { orderId: id, error: err });
  }

  return NextResponse.json({
    success: true,
    order: normalized,
    message: "Order marked as shipped"
  });
}
