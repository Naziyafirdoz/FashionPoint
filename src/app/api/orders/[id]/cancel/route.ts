import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase";
import { buildCancellationMetadataPayload } from "@/lib/orders/cancellation";
import {
  buildPrepaidCancelRequestPayload,
  customerCancelRequestMessage,
  validateCustomerRefundDetails,
  type CustomerRefundDetailsInput
} from "@/lib/orders/manual-refund";
import {
  getAvailableFulfillmentClearColumns,
  isCancellationSchemaReady
} from "@/lib/orders/cancellation-schema";
import { isPrepaidPayment } from "@/lib/orders/payment-rules";
import {
  buildStatusUpdatePayloadSafe,
  normalizeOrderRecord,
  persistOrderUpdate
} from "@/lib/orders/normalize-order";
import {
  canCustomerCancelOrder,
  cancelSuccessMessage,
  customerCancelBlockedReason
} from "@/lib/orders/customer-orders";
import type { Order } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

function logCancelAttempt(details: Record<string, unknown>) {
  console.error("[orders/cancel]", JSON.stringify(details));
}

export async function POST(req: Request, { params }: RouteContext) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as CustomerRefundDetailsInput & {
    cancellation_reason?: string;
  };
  const cancellationReason =
    typeof body.cancellation_reason === "string" ? body.cancellation_reason : undefined;

  const { data: existing, error: fetchError } = await db
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    logCancelAttempt({
      orderId: id,
      userId: user.id,
      stage: "fetch",
      error: fetchError
    });
    return NextResponse.json(
      { error: fetchError.message || "Unable to load order" },
      { status: 500 }
    );
  }

  if (!existing) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const order = existing as Order;

  if (order.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const eligible = canCustomerCancelOrder(order);
  const blocked = customerCancelBlockedReason(order);

  logCancelAttempt({
    orderId: id,
    userId: user.id,
    orderStatus: order.status,
    paymentStatus: order.payment_status,
    paymentMethod: order.payment_method,
    trackingNumber: order.tracking_number ?? null,
    trackingId: order.tracking_id ?? null,
    shipmentId: order.shipment_id ?? null,
    deliveryStatus: order.delivery_status ?? null,
    eligible,
    blockedReason: blocked
  });

  if (blocked || !eligible) {
    return NextResponse.json(
      { error: blocked ?? "Order not eligible for cancellation" },
      { status: 400 }
    );
  }

  const isPrepaidPaid =
    isPrepaidPayment(order.payment_method) && (order.payment_status ?? "").toLowerCase() === "paid";

  let updatePayload: Record<string, unknown>;

  if (isPrepaidPaid) {
    const refundValidation = validateCustomerRefundDetails(body);
    if (!refundValidation.ok) {
      return NextResponse.json({ error: refundValidation.error }, { status: 400 });
    }

    updatePayload = buildPrepaidCancelRequestPayload({
      order,
      cancellationReason,
      refundDetails: refundValidation.payload
    });
  } else {
    const [cancellationColumnsReady, fulfillmentColumns] = await Promise.all([
      isCancellationSchemaReady(db),
      getAvailableFulfillmentClearColumns(db)
    ]);

    const extra = buildCancellationMetadataPayload({
      order,
      cancellationReason,
      includeCancellationColumns: cancellationColumnsReady,
      availableFulfillmentColumns: fulfillmentColumns
    });

    updatePayload = await buildStatusUpdatePayloadSafe(db, order, "cancelled", extra);
  }

  logCancelAttempt({
    orderId: id,
    userId: user.id,
    stage: "update_payload",
    isPrepaidPaid,
    payloadKeys: Object.keys(updatePayload)
  });

  const { order: updated, error: updateError } = await persistOrderUpdate(db, id, updatePayload);

  if (updateError || !updated) {
    logCancelAttempt({
      orderId: id,
      userId: user.id,
      stage: "update_failed",
      error: updateError
    });
    return NextResponse.json(
      { error: updateError ?? "Unable to cancel order" },
      { status: 500 }
    );
  }

  const normalized = await normalizeOrderRecord(db, updated, { persist: false });

  logCancelAttempt({
    orderId: id,
    userId: user.id,
    stage: "success",
    newStatus: normalized.status,
    newPaymentStatus: normalized.payment_status,
    cancelledAt: normalized.cancelled_at ?? null,
    refundStatus: normalized.refund_status ?? null
  });

  return NextResponse.json({
    success: true,
    order: normalized,
    message: isPrepaidPaid ? customerCancelRequestMessage() : cancelSuccessMessage(normalized)
  });
}
