import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { normalizeOrderRecord } from "@/lib/orders/normalize-order";
import {
  buildMinimalShipUpdatePayload,
  buildShipUpdatePayload,
  getAvailableShippingOptionalColumns,
  isShippingSchemaError,
  stripOptionalShippingFields
} from "@/lib/orders/shipping-schema";
import { generateDeliveryOtp } from "@/lib/orders/workflow";
import { hydrateShippingSettings } from "@/lib/shipping/settings-store";
import { createShipmentForOrder } from "@/lib/delivery/shipment-service";
import { notifyAdminOrderShipped, notifyCustomerOrderShipped } from "@/lib/server/notifications/new-order-alerts";
import { customerShippedMessage } from "@/lib/orders/fulfillment-workflow";
import type { Order } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

const isDev = process.env.NODE_ENV === "development";

function shipErrorResponse(message: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json(
    {
      error: message,
      ...extra
    },
    { status }
  );
}

export async function POST(req: Request, { params }: RouteContext) {
  await hydrateShippingSettings();

  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const { data: existing, error: fetchError } = await auth.ctx.db
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    if (isDev) {
      console.error("[ship-order] fetch failed", { orderId: id, error: fetchError });
    }
    return shipErrorResponse(
      isDev ? fetchError.message : "Unable to load order",
      500,
      isDev ? { details: fetchError } : undefined
    );
  }

  if (!existing) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  let order = existing as Order;

  if (order.status !== "ready_to_ship") {
    return NextResponse.json(
      { error: "Order must be Ready To Ship before shipping" },
      { status: 400 }
    );
  }

  if (!order.shipment_id && !order.tracking_number) {
    await createShipmentForOrder(auth.ctx.db, order);
    const { data: refreshed } = await auth.ctx.db.from("orders").select("*").eq("id", id).maybeSingle();
    if (refreshed) order = refreshed as Order;
  }

  const trackingNumber =
    typeof body.tracking_number === "string"
      ? body.tracking_number.trim()
      : typeof body.tracking_id === "string"
        ? body.tracking_id.trim()
        : order.tracking_number?.trim() || order.tracking_id?.trim() || "";
  const courierPartner =
    typeof body.courier_partner === "string"
      ? body.courier_partner.trim()
      : typeof body.courier_name === "string"
        ? body.courier_name.trim()
        : order.courier_partner?.trim() || order.courier_name?.trim() || "";
  const shippingDate =
    typeof body.shipping_date === "string" && body.shipping_date
      ? new Date(body.shipping_date).toISOString()
      : new Date().toISOString();

  const resolvedTracking = trackingNumber || order.tracking_number || order.tracking_id || "PENDING";

  if (!courierPartner) {
    return NextResponse.json({ error: "Courier partner is required" }, { status: 400 });
  }

  const deliveryOtp = generateDeliveryOtp();
  const optionalColumns = await getAvailableShippingOptionalColumns(auth.ctx.db);

  let updatePayload = buildShipUpdatePayload({
    trackingNumber: resolvedTracking,
    courierPartner,
    shippingDate,
    deliveryOtp,
    optionalColumns
  });

  if (isDev) {
    console.log("[ship-order] attempt", {
      orderId: id,
      orderNumber: order.order_number,
      payload: updatePayload,
      optionalColumns: Array.from(optionalColumns)
    });
  }

  let { data: updated, error } = await auth.ctx.db
    .from("orders")
    .update(updatePayload)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error && isShippingSchemaError(error)) {
    const stripped = stripOptionalShippingFields(updatePayload);
    if (isDev) {
      console.warn("[ship-order] retry without optional columns", {
        orderId: id,
        payload: stripped,
        originalError: error
      });
    }
    const retry = await auth.ctx.db
      .from("orders")
      .update(stripped)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    updated = retry.data;
    error = retry.error;
    updatePayload = stripped;
  }

  if (error) {
    const minimalPayload = buildMinimalShipUpdatePayload(trackingNumber, courierPartner);
    if (JSON.stringify(minimalPayload) !== JSON.stringify(updatePayload)) {
      if (isDev) {
        console.warn("[ship-order] retry minimal payload", { orderId: id, payload: minimalPayload });
      }
      const retryMinimal = await auth.ctx.db
        .from("orders")
        .update(minimalPayload)
        .eq("id", id)
        .select("*")
        .maybeSingle();
      updated = retryMinimal.data;
      error = retryMinimal.error;
      updatePayload = minimalPayload;
    }
  }

  if (error) {
    console.error("[ship-order] supabaseError", {
      orderId: id,
      payload: updatePayload,
      supabaseError: error
    });
    return shipErrorResponse(
      isDev ? error.message : "Unable to update shipping details",
      500,
      isDev
        ? {
            details: {
              code: error.code,
              message: error.message,
              hint: error.hint,
              details: error.details
            }
          }
        : undefined
    );
  }

  if (!updated) {
    return NextResponse.json({ error: "Order not found after update" }, { status: 404 });
  }

  const normalized = await normalizeOrderRecord(auth.ctx.db, updated as Order, { persist: false });

  const shippedMessage = customerShippedMessage(normalized);
  await notifyCustomerOrderShipped(normalized, shippedMessage);
  await notifyAdminOrderShipped(auth.ctx.db, normalized);

  const otpStored = optionalColumns.has("delivery_otp") && Boolean(updatePayload.delivery_otp);

  return NextResponse.json({
    success: true,
    order: normalized,
    delivery_otp: otpStored ? deliveryOtp : undefined,
    message: otpStored
      ? `Order shipped. Delivery OTP: ${deliveryOtp}`
      : "Order marked as shipped."
  });
}
