import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { buildCancellationFulfillmentClearPayload } from "@/lib/orders/cancellation";
import { getAvailableFulfillmentClearColumns } from "@/lib/orders/cancellation-schema";
import {
  buildApproveCancellationPayload,
  canAdminApproveCancellation
} from "@/lib/orders/manual-refund";
import { normalizeOrderRecord, persistOrderUpdate } from "@/lib/orders/normalize-order";
import {
  canUseRazorpayAutoRefund,
  isRazorpayRefundIdColumnReady,
  processRazorpayCancellationRefund
} from "@/lib/orders/razorpay-cancel-refund";
import { sendCustomerRefundProcessedEmail } from "@/lib/server/notifications/refund-processed-email";
import type { Order } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: RouteContext) {
  const auth = await requireAdmin();
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

  const order = existing as Order;
  if (!canAdminApproveCancellation(order)) {
    return NextResponse.json({ error: "This order cannot be approved for cancellation" }, { status: 400 });
  }

  const fulfillmentColumns = await getAvailableFulfillmentClearColumns(auth.ctx.db);

  let updatePayload: Record<string, unknown>;
  let refundCompleted = false;

  if (canUseRazorpayAutoRefund(order)) {
    const columnReady = await isRazorpayRefundIdColumnReady(auth.ctx.db);
    if (!columnReady) {
      return NextResponse.json(
        { error: "Razorpay refund tracking is not available on this database yet." },
        { status: 503 }
      );
    }

    const refundResult = await processRazorpayCancellationRefund(order, {
      adminUserId: auth.ctx.userId
    });
    if (!refundResult.ok) {
      return NextResponse.json({ error: refundResult.error }, { status: refundResult.status });
    }

    updatePayload = {
      ...refundResult.payload,
      ...buildCancellationFulfillmentClearPayload(fulfillmentColumns)
    };
    refundCompleted = refundResult.completed;
  } else {
    updatePayload = {
      ...buildApproveCancellationPayload(order),
      ...buildCancellationFulfillmentClearPayload(fulfillmentColumns)
    };
  }

  const { order: updated, error } = await persistOrderUpdate(auth.ctx.db, id, updatePayload);
  if (error || !updated) {
    return NextResponse.json({ error: error ?? "Unable to approve cancellation" }, { status: 500 });
  }

  const normalized = await normalizeOrderRecord(auth.ctx.db, updated, { persist: true });

  if (refundCompleted) {
    void sendCustomerRefundProcessedEmail(normalized).catch(() => undefined);
  }

  return NextResponse.json({
    success: true,
    order: normalized,
    refund_completed: refundCompleted
  });
}
