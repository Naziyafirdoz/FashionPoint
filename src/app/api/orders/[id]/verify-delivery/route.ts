import { NextResponse } from "next/server";
import { requireDeliveryStaff } from "@/lib/admin/require-staff";
import { isOwnerOrAdmin } from "@/lib/admin/staff";
import { normalizeOrderRecord } from "@/lib/orders/normalize-order";
import { normalizeLegacyStatus } from "@/lib/orders/status-config";
import { processDeliveredNotification } from "@/lib/server/notifications/delivered-route-handler";
import { invalidateAdminDataCaches } from "@/lib/admin/invalidate-admin-caches";
import {
  consumeActionToken,
  lookupActionToken,
  normalizeReceivedToken,
  validateActionToken
} from "@/lib/server/order-actions/tokens";
import type { Order } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Delivery Staff OTP completion: out_for_delivery + delivery_boy → delivered.
 * Assigned delivery-capable staff must match. Owner/admin may verify any delivery_boy OFD order.
 */
export async function POST(req: Request, { params }: RouteContext) {
  const auth = await requireDeliveryStaff();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const otp = typeof body.otp === "string" ? body.otp.trim() : "";
  const actionTokenRaw =
    typeof body.action_token === "string" ? body.action_token.trim() : "";

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
  const status = normalizeLegacyStatus(order.status);

  if (status === "delivered") {
    return NextResponse.json({ error: "Order already delivered." }, { status: 409 });
  }

  if (order.fulfillment_method === "rapido" || order.fulfillment_method === "dtdc") {
    return NextResponse.json(
      { error: "Rapido and DTDC orders cannot be marked as delivered." },
      { status: 400 }
    );
  }

  if (order.fulfillment_method !== "delivery_boy") {
    return NextResponse.json(
      { error: "OTP verification is only for Delivery Staff orders." },
      { status: 400 }
    );
  }

  if (status !== "out_for_delivery") {
    return NextResponse.json(
      { error: "Order must be out for delivery before OTP verification" },
      { status: 400 }
    );
  }

  if (!isOwnerOrAdmin(auth.ctx.roles)) {
    const assigned = order.assigned_delivery_worker_id?.trim() ?? "";
    if (!assigned || assigned !== auth.ctx.userId) {
      return NextResponse.json(
        { error: "You can only verify delivery for orders assigned to you." },
        { status: 403 }
      );
    }
  }

  if (!order.delivery_otp) {
    return NextResponse.json(
      {
        error:
          "No delivery OTP on file. Ask an admin to re-assign delivery or mark delivered."
      },
      { status: 400 }
    );
  }

  if (order.delivery_otp !== otp) {
    return NextResponse.json(
      {
        error:
          "Invalid OTP. Please enter the correct 4-digit delivery OTP provided by the customer."
      },
      { status: 400 }
    );
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
    .eq("status", "out_for_delivery")
    .eq("fulfillment_method", "delivery_boy")
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[verify-delivery] update failed", { orderId: id, message: error.message });
    return NextResponse.json({ error: "Unable to confirm delivery" }, { status: 500 });
  }

  if (!updated) {
    return NextResponse.json({ error: "Order already delivered." }, { status: 409 });
  }

  if (actionTokenRaw) {
    try {
      const token = normalizeReceivedToken(actionTokenRaw);
      const validation = await validateActionToken(auth.ctx.db, token, "mark_delivery");
      if (validation.ok && validation.record.order_id === id) {
        await consumeActionToken(auth.ctx.db, validation.record.id, auth.ctx.userId);
      } else {
        const lookup = await lookupActionToken(auth.ctx.db, token);
        if (
          lookup?.order_id === id &&
          lookup.action_type === "mark_delivery" &&
          !lookup.used
        ) {
          await consumeActionToken(auth.ctx.db, lookup.id, auth.ctx.userId);
        }
      }
    } catch (err) {
      console.warn("[verify-delivery] mark_delivery token consume skipped", err);
    }
  }

  const normalized = await normalizeOrderRecord(auth.ctx.db, updated as Order, {
    persist: false
  });
  invalidateAdminDataCaches();

  try {
    const outcome = await processDeliveredNotification(auth.ctx.db, id);
    if (!outcome.ok || outcome.result === "failed") {
      console.error("[verify-delivery] delivered email failed", {
        orderId: id,
        error: outcome.ok ? outcome.result : outcome.error
      });
    }
  } catch (err) {
    console.error("[verify-delivery] delivered email failed", { orderId: id, error: err });
  }

  return NextResponse.json({
    success: true,
    order: normalized,
    message: "Delivery verified — order marked as delivered"
  });
}
