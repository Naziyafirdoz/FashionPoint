import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase";
import { isAdminUser } from "@/lib/auth/helpers";
import { normalizeOrderRecord } from "@/lib/orders/normalize-order";
import {
  SHIPMENT_LOCKED_ERROR,
  isShipmentStatusLocked
} from "@/lib/orders/fulfillment-method";
import {
  buildShippingAddressWithRapidoDetails,
  DEFAULT_COURIER_NAME,
  type RapidoDeliveryDetails
} from "@/lib/orders/rapido-delivery-metadata";
import { getAvailableShippingOptionalColumns } from "@/lib/orders/shipping-schema";
import { normalizeLegacyStatus } from "@/lib/orders/status-config";
import type { Order } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

function parseDetails(body: Record<string, unknown>): RapidoDeliveryDetails | null {
  const courier_name =
    (typeof body.courier_name === "string" ? body.courier_name.trim() : "") ||
    DEFAULT_COURIER_NAME;
  const rider_name = typeof body.rider_name === "string" ? body.rider_name.trim() : "";
  const rider_phone = typeof body.rider_phone === "string" ? body.rider_phone.trim() : "";
  const vehicle_number =
    typeof body.vehicle_number === "string" ? body.vehicle_number.trim() : "";
  const pickup_time = typeof body.pickup_time === "string" ? body.pickup_time.trim() : "";
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";

  if (!courier_name) {
    return null;
  }

  return { courier_name, rider_name, rider_phone, vehicle_number, pickup_time, notes };
}

export async function POST(req: Request, { params }: RouteContext) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = await isAdminUser(user.id);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = createServiceClient();
  if (!db) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const details = parseDetails(body as Record<string, unknown>);
  if (!details) {
    return NextResponse.json({ error: "Rapido delivery details are required" }, { status: 400 });
  }

  const { id } = await params;
  const { data: existing, error: fetchError } = await db
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

  const existingOrder = existing as Order;
  const status = normalizeLegacyStatus(existingOrder.status);

  // Lock only after successful mark-shipped (or later). Selecting Rapido alone does not lock.
  if (isShipmentStatusLocked(status)) {
    return NextResponse.json({ error: SHIPMENT_LOCKED_ERROR }, { status: 409 });
  }

  if (status !== "ready_to_ship") {
    return NextResponse.json(
      {
        error: "Rapido delivery details can only be updated while the order is ready for shipping."
      },
      { status: 400 }
    );
  }

  const shippingAddress = buildShippingAddressWithRapidoDetails(
    existingOrder.shipping_address as Record<string, unknown> | undefined,
    details
  );

  const tracking =
    typeof (body as Record<string, unknown>).tracking_number === "string"
      ? ((body as Record<string, unknown>).tracking_number as string).trim()
      : "";

  const payload: Record<string, unknown> = {
    shipping_address: shippingAddress,
    updated_at: new Date().toISOString()
  };

  // Optional — reuse existing shipment tracking columns (same as mark-shipped).
  if (tracking) {
    payload.tracking_id = tracking;
    const optionalColumns = await getAvailableShippingOptionalColumns(db);
    if (optionalColumns.has("tracking_number")) {
      payload.tracking_number = tracking;
    }
  }

  // Race-safe: refuse mutation if another request already moved the order out of ready_to_ship.
  const { data: updated, error } = await db
    .from("orders")
    .update(payload)
    .eq("id", id)
    .eq("status", "ready_to_ship")
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[rapido-delivery-details] save failed", { orderId: id, message: error.message });
    return NextResponse.json({ error: "Unable to save Rapido delivery details" }, { status: 500 });
  }

  if (!updated) {
    return NextResponse.json({ error: SHIPMENT_LOCKED_ERROR }, { status: 409 });
  }

  const normalized = await normalizeOrderRecord(db, updated as Order, { persist: false });
  return NextResponse.json({ success: true, order: normalized });
}
