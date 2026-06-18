import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { normalizeOrderRecord } from "@/lib/orders/normalize-order";
import {
  buildManualRefundCompletedPayload,
  canAdminMarkManualRefundCompleted,
  validateManualRefundCompletion
} from "@/lib/orders/manual-refund";
import {
  buildMarkRefundedPayload,
  validateMarkRefunded
} from "@/lib/orders/refunds";
import {
  isRefundSchemaError,
  isRefundSchemaReady,
  refundMigrationResponse
} from "@/lib/orders/refund-schema";
import { isCancellationSchemaError, stripCancellationFields } from "@/lib/orders/cancellation-schema";
import type { Order } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const schemaReady = await isRefundSchemaReady(auth.ctx.db);
  if (!schemaReady) {
    return NextResponse.json(refundMigrationResponse(), { status: 503 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const refund_reference =
    typeof body.refund_reference === "string" ? body.refund_reference : "";
  const refund_notes = typeof body.refund_notes === "string" ? body.refund_notes : undefined;

  const { data: existing, error: fetchError } = await auth.ctx.db
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    if (isRefundSchemaError(fetchError)) {
      return NextResponse.json(refundMigrationResponse(), { status: 503 });
    }
    return NextResponse.json(
      { success: false, message: "Unable to load order" },
      { status: 500 }
    );
  }

  if (!existing) {
    return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
  }

  const order = existing as Order;
  const isManualWorkflow = canAdminMarkManualRefundCompleted(order);

  let updatePayload: Record<string, unknown>;

  if (isManualWorkflow) {
    const manualValidation = validateManualRefundCompletion({ refund_reference, refund_notes });
    if (!manualValidation.ok) {
      return NextResponse.json({ success: false, message: manualValidation.error }, { status: 400 });
    }
    updatePayload = buildManualRefundCompletedPayload(
      order,
      { refund_reference: manualValidation.reference, refund_notes },
      auth.ctx.userId
    );
  } else {
    const validation = validateMarkRefunded(order, { refund_reference, refund_notes });
    if (!validation.ok) {
      return NextResponse.json({ success: false, message: validation.error }, { status: 400 });
    }
    updatePayload = buildMarkRefundedPayload(order, {
      refund_reference: refund_reference.trim(),
      refund_notes
    });
  }

  let { data: updated, error } = await auth.ctx.db
    .from("orders")
    .update(updatePayload)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error && isCancellationSchemaError(error)) {
    const retryPayload = stripCancellationFields(updatePayload);
    const retry = await auth.ctx.db
      .from("orders")
      .update(retryPayload)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    updated = retry.data;
    error = retry.error;
  }

  if (error) {
    if (isRefundSchemaError(error)) {
      return NextResponse.json(refundMigrationResponse(), { status: 503 });
    }
    return NextResponse.json(
      { success: false, message: "Unable to complete refund" },
      { status: 500 }
    );
  }

  if (!updated) {
    return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
  }

  const normalized = await normalizeOrderRecord(auth.ctx.db, updated as Order, { persist: true });

  return NextResponse.json({ success: true, order: normalized });
}
