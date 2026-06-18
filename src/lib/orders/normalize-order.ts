import type { SupabaseClient } from "@supabase/supabase-js";
import { enrichOrderRecordItems } from "@/lib/orders/enrich-items";
import {
  applyPaymentRulesToOrder,
  isInvalidPaymentCombination,
  resolvePaymentStatus
} from "@/lib/orders/payment-rules";
import { buildRefundInitiatedPayload, sanitizeRefundState } from "@/lib/orders/refunds";
import {
  isRefundSchemaError,
  isRefundSchemaReady,
  isRefundOptionalSchemaReady,
  stripOptionalRefundFields,
  stripRefundFields
} from "@/lib/orders/refund-schema";
import {
  isCancellationSchemaError,
  stripCancellationFields,
  stripFulfillmentMigrationFields,
  buildMinimalCancelPayload
} from "@/lib/orders/cancellation-schema";
import {
  isShippingSchemaError,
  stripOptionalShippingFields
} from "@/lib/orders/shipping-schema";
import type { Order, OrderStatus } from "@/types";

export async function normalizeOrderRecord(
  db: SupabaseClient,
  order: Order,
  options?: { persist?: boolean }
): Promise<Order> {
  const withSku = await enrichOrderRecordItems(db, order);
  const sanitized = sanitizeRefundState(withSku as Order);
  const corrected = applyPaymentRulesToOrder(sanitized);

  if (!options?.persist) {
    return corrected;
  }

  const paymentChanged = corrected.payment_status !== order.payment_status;
  const itemsChanged = JSON.stringify(corrected.items) !== JSON.stringify(order.items);

  if (!paymentChanged && !itemsChanged) {
    return corrected;
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (paymentChanged) update.payment_status = corrected.payment_status;
  if (itemsChanged) update.items = corrected.items;

  const { data } = await db
    .from("orders")
    .update(update)
    .eq("id", order.id)
    .select("*")
    .maybeSingle();

  return (data as Order) ?? corrected;
}

export function buildStatusUpdatePayload(
  existing: Order,
  nextStatus: OrderStatus,
  extra?: Record<string, unknown>,
  includeRefundFields = true
): Record<string, unknown> {
  const payment_status = resolvePaymentStatus(
    nextStatus,
    existing.payment_method,
    existing.payment_status
  );

  const payload: Record<string, unknown> = {
    status: nextStatus,
    payment_status,
    updated_at: new Date().toISOString(),
    ...extra
  };

  if (includeRefundFields && nextStatus === "cancelled" && payment_status === "refund_pending") {
    const refundPayload = buildRefundInitiatedPayload({
      ...existing,
      payment_status: existing.payment_status
    });
    if (refundPayload) {
      Object.assign(payload, refundPayload);
    }
  }

  return payload;
}

export async function buildStatusUpdatePayloadSafe(
  db: SupabaseClient,
  existing: Order,
  nextStatus: OrderStatus,
  extra?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const coreReady = await isRefundSchemaReady(db);
  const payload = buildStatusUpdatePayload(existing, nextStatus, extra, coreReady);

  if (coreReady && !(await isRefundOptionalSchemaReady(db))) {
    return stripOptionalRefundFields(payload);
  }

  return payload;
}

export async function persistOrderUpdate(
  db: SupabaseClient,
  id: string,
  payload: Record<string, unknown>
): Promise<{ order: Order | null; error: string | null }> {
  let updatePayload = payload;
  let lastError: { message?: string; code?: string } | null = null;

  const attemptUpdate = async (nextPayload: Record<string, unknown>) => {
    return db.from("orders").update(nextPayload).eq("id", id).select("*").maybeSingle();
  };

  let { data: order, error } = await attemptUpdate(updatePayload);

  if (!error) {
    return { order: (order as Order) ?? null, error: null };
  }

  lastError = error;

  const retries: Array<(current: Record<string, unknown>) => Record<string, unknown>> = [
    (current) => stripOptionalRefundFields(current),
    (current) => stripRefundFields(payload),
    (current) => stripCancellationFields(current),
    (current) => stripFulfillmentMigrationFields(current),
    (current) => stripOptionalShippingFields(current),
    () => buildMinimalCancelPayload(payload)
  ];

  for (const buildRetryPayload of retries) {
    const nextPayload = buildRetryPayload(updatePayload);
    if (JSON.stringify(nextPayload) === JSON.stringify(updatePayload)) {
      continue;
    }

    updatePayload = nextPayload;
    const retry = await attemptUpdate(updatePayload);
    if (!retry.error) {
      return { order: (retry.data as Order) ?? null, error: null };
    }

    lastError = retry.error;

    const retryMsg = (retry.error.message ?? "").toLowerCase();
    const isSchemaError =
      isRefundSchemaError(retry.error) ||
      isCancellationSchemaError(retry.error) ||
      isShippingSchemaError(retry.error) ||
      retry.error.code === "PGRST204" ||
      retry.error.code === "42703" ||
      retryMsg.includes("schema cache") ||
      retryMsg.includes("column");

    if (!isSchemaError) {
      break;
    }
  }

  return {
    order: null,
    error: formatPersistOrderError(lastError)
  };
}

function formatPersistOrderError(error: { message?: string; code?: string } | null): string {
  if (!error?.message) return "Unable to update order";
  const msg = error.message.toLowerCase();

  if (msg.includes("permission denied") || error.code === "42501") {
    return "Permission denied while updating the order.";
  }
  if (error.code === "PGRST204" || error.code === "42703" || msg.includes("schema cache")) {
    return `Database schema mismatch: ${error.message}`;
  }
  if (msg.includes("column")) {
    return `Database column error: ${error.message}`;
  }

  return error.message;
}

export function validateStatusTransition(
  existing: Pick<Order, "status" | "payment_method" | "payment_status">,
  nextStatus: OrderStatus
): { ok: true } | { ok: false; message: string } {
  const resolved = resolvePaymentStatus(
    nextStatus,
    existing.payment_method,
    existing.payment_status
  );

  if (
    isInvalidPaymentCombination(nextStatus, existing.payment_method, existing.payment_status) &&
    resolved === existing.payment_status
  ) {
    return {
      ok: false,
      message: "Invalid order and payment status combination. Update blocked."
    };
  }

  return { ok: true };
}
