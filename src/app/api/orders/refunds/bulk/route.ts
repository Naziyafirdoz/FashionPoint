import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { normalizeOrderRecord } from "@/lib/orders/normalize-order";
import {
  buildMarkRefundedPayload,
  validateMarkRefunded
} from "@/lib/orders/refunds";
import {
  isRefundSchemaError,
  isRefundSchemaReady,
  refundMigrationResponse
} from "@/lib/orders/refund-schema";
import type { Order } from "@/types";

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const schemaReady = await isRefundSchemaReady(auth.ctx.db);
  if (!schemaReady) {
    return NextResponse.json(refundMigrationResponse(), { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const orderIds = Array.isArray(body.order_ids)
    ? body.order_ids.filter((id: unknown) => typeof id === "string")
    : [];

  if (orderIds.length === 0) {
    return NextResponse.json({ error: "No orders selected" }, { status: 400 });
  }

  const refund_reference_prefix =
    typeof body.refund_reference_prefix === "string"
      ? body.refund_reference_prefix.trim()
      : `REF-BULK-${new Date().getFullYear()}`;
  const refund_notes =
    typeof body.refund_notes === "string" ? body.refund_notes.trim() : "Bulk refund processed";

  const results: { id: string; success: boolean; error?: string }[] = [];

  for (const id of orderIds) {
    const { data: existing, error: fetchError } = await auth.ctx.db
      .from("orders")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !existing) {
      results.push({ id, success: false, error: "Order not found" });
      continue;
    }

    const order = existing as Order;
    const reference = `${refund_reference_prefix}-${order.order_number.replace(/\D/g, "").slice(-6)}`;
    const validation = validateMarkRefunded(order, { refund_reference: reference, refund_notes });

    if (!validation.ok) {
      results.push({ id, success: false, error: validation.error });
      continue;
    }

    const updatePayload = buildMarkRefundedPayload(order, {
      refund_reference: reference,
      refund_notes
    });

    const { error } = await auth.ctx.db.from("orders").update(updatePayload).eq("id", id);

    if (error) {
      results.push({
        id,
        success: false,
        error: isRefundSchemaError(error) ? refundMigrationResponse().message : "Update failed"
      });
      continue;
    }

    results.push({ id, success: true });
  }

  const successCount = results.filter((r) => r.success).length;

  return NextResponse.json({
    success: successCount > 0,
    processed: successCount,
    failed: results.length - successCount,
    results
  });
}
