import { NextResponse } from "next/server";
import { requireAdminStaff } from "@/lib/admin/require-staff";
import { normalizeOrderRecord } from "@/lib/orders/normalize-order";
import {
  assertFulfillmentMethodAllowed,
  isShipmentStatusLocked,
  SHIPMENT_LOCKED_ERROR
} from "@/lib/orders/fulfillment-method";
import { getAvailableFulfillmentColumns } from "@/lib/orders/fulfillment-schema";
import { assertTransition } from "@/lib/orders/workflow-validation";
import { normalizeLegacyStatus } from "@/lib/orders/status-config";
import { notifyCustomerOutForDelivery } from "@/lib/server/notifications/out-for-delivery-email";
import { notifyDeliveryWorkerAssigned } from "@/lib/server/notifications/delivery-worker-assigned-email";
import { invalidateAdminDataCaches } from "@/lib/admin/invalidate-admin-caches";
import { generateDeliveryOtp } from "@/lib/orders/workflow";
import { isDeliveryAssignableStaff } from "@/lib/admin/staff";
import type { Order } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

/** Leftover values from MockDeliveryProvider at payment finalize — not real courier AWBs. */
function isMockTrackingValue(value: string | null | undefined): boolean {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return false;
  return /^MOCK-RPD[\w-]*/i.test(trimmed) || /^mock-shp[\w-]*/i.test(trimmed);
}

/**
 * LOCAL Delivery Boy path: ready_to_ship → out_for_delivery with assignment.
 * Body: { delivery_worker_id: string }
 */
export async function POST(req: Request, { params }: RouteContext) {
  const auth = await requireAdminStaff();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const deliveryWorkerId =
    typeof body.delivery_worker_id === "string" ? body.delivery_worker_id.trim() : "";

  if (!deliveryWorkerId) {
    return NextResponse.json({ error: "delivery_worker_id is required" }, { status: 400 });
  }

  let { data: worker, error: workerError } = await auth.ctx.db
    .from("admin_users")
    .select("user_id, role, roles, email, display_name, is_active")
    .eq("user_id", deliveryWorkerId)
    .maybeSingle();

  if (workerError) {
    // roles column may be missing pre-migration
    const legacy = await auth.ctx.db
      .from("admin_users")
      .select("user_id, role, email, display_name, is_active")
      .eq("user_id", deliveryWorkerId)
      .maybeSingle();
    worker = legacy.data as typeof worker;
    workerError = legacy.error;
  }

  if (workerError || !worker) {
    return NextResponse.json({ error: "Delivery worker not found" }, { status: 400 });
  }

  if (
    !isDeliveryAssignableStaff({
      role: worker.role as string | undefined,
      roles: (worker as { roles?: unknown }).roles,
      is_active: (worker as { is_active?: boolean }).is_active !== false
    })
  ) {
    return NextResponse.json(
      { error: "Selected user is not eligible for delivery assignment" },
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

  // Method is locked after assign-delivery / mark-shipped commit (parity with mark-shipped).
  if (isShipmentStatusLocked(currentStatus)) {
    return NextResponse.json({ error: SHIPMENT_LOCKED_ERROR }, { status: 409 });
  }

  if (currentStatus !== "ready_to_ship") {
    return NextResponse.json(
      { error: "Only ready for shipping orders can be assigned to delivery staff" },
      { status: 400 }
    );
  }

  const transitionError = assertTransition(order.status, "out_for_delivery");
  if (transitionError) {
    return NextResponse.json({ error: transitionError }, { status: 400 });
  }

  const allowed = await assertFulfillmentMethodAllowed(order, "delivery_boy");
  if (!allowed.ok) {
    return NextResponse.json({ error: allowed.error }, { status: 400 });
  }

  const fulfillmentColumns = await getAvailableFulfillmentColumns(auth.ctx.db);
  if (
    !fulfillmentColumns.has("assigned_delivery_worker_id") ||
    !fulfillmentColumns.has("fulfillment_method")
  ) {
    return NextResponse.json(
      {
        error:
          "Delivery assignment columns are not available. Apply the fulfillment migration first."
      },
      { status: 503 }
    );
  }

  const now = new Date().toISOString();
  const deliveryOtp = generateDeliveryOtp();
  const payload: Record<string, unknown> = {
    status: "out_for_delivery",
    fulfillment_method: "delivery_boy",
    assigned_delivery_worker_id: deliveryWorkerId,
    delivery_otp: deliveryOtp,
    updated_at: now,
    courier_name: "Delivery Staff",
    delivery_partner: "Delivery Staff"
  };
  if (fulfillmentColumns.has("fulfillment_zone")) {
    payload.fulfillment_zone = allowed.zone;
  }

  // Delivery Boy is internal — strip leftover mock AWB written at payment finalize only.
  // Do not clear values that do not match the mock-provider pattern.
  if (
    isMockTrackingValue(order.tracking_number) ||
    isMockTrackingValue(order.tracking_id)
  ) {
    payload.tracking_number = null;
    payload.tracking_id = null;
  }

  const { data: updated, error } = await auth.ctx.db
    .from("orders")
    .update(payload)
    .eq("id", id)
    .eq("status", "ready_to_ship")
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[assign-delivery] update failed", error.message);
    return NextResponse.json({ error: "Unable to assign delivery staff" }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json(
      { error: "Assignment failed — order status may have changed" },
      { status: 409 }
    );
  }

  const normalized = await normalizeOrderRecord(auth.ctx.db, updated as Order, { persist: false });
  invalidateAdminDataCaches();

  try {
    await notifyCustomerOutForDelivery(normalized);
  } catch (err) {
    console.error("[assign-delivery] customer email failed", { orderId: id, error: err });
  }

  try {
    const emailResult = await notifyDeliveryWorkerAssigned({
      order: normalized,
      workerUserId: deliveryWorkerId,
      profileEmail: typeof worker.email === "string" ? worker.email : null,
      db: auth.ctx.db
    });
    if (emailResult === "failed") {
      console.error(
        "[assign-delivery] Delivery assignment succeeded but Delivery Assigned notification email failed.",
        { orderId: id, workerUserId: deliveryWorkerId }
      );
    }
  } catch (err) {
    console.error(
      "[assign-delivery] Delivery assignment succeeded but Delivery Assigned notification email failed.",
      {
        orderId: id,
        workerUserId: deliveryWorkerId,
        error: err
      }
    );
  }

  return NextResponse.json({
    success: true,
    order: normalized,
    message: "Delivery staff assigned — order out for delivery"
  });
}
