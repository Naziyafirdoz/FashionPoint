import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { buildCancellationFulfillmentClearPayload } from "@/lib/orders/cancellation";
import { getAvailableFulfillmentClearColumns } from "@/lib/orders/cancellation-schema";
import {
  buildApproveCancellationPayload,
  canAdminApproveCancellation
} from "@/lib/orders/manual-refund";
import { normalizeOrderRecord, persistOrderUpdate } from "@/lib/orders/normalize-order";
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
  const updatePayload = {
    ...buildApproveCancellationPayload(order),
    ...buildCancellationFulfillmentClearPayload(fulfillmentColumns)
  };

  const { order: updated, error } = await persistOrderUpdate(auth.ctx.db, id, updatePayload);
  if (error || !updated) {
    return NextResponse.json({ error: error ?? "Unable to approve cancellation" }, { status: 500 });
  }

  const normalized = await normalizeOrderRecord(auth.ctx.db, updated, { persist: true });

  if (
    normalized.status === "cancelled" ||
    normalized.status === "cancellation_approved"
  ) {
    try {
      const { sendTemplatedCustomerOrderEmail } = await import(
        "@/lib/server/notifications/send-templated-customer-email"
      );
      await sendTemplatedCustomerOrderEmail({
        eventKey: "order_cancelled",
        order: normalized,
        db: auth.ctx.db
      });
    } catch (err) {
      console.error("[cancellation/approve] customer cancelled email failed", {
        orderId: id,
        error: err
      });
    }
  }

  return NextResponse.json({ success: true, order: normalized });
}
