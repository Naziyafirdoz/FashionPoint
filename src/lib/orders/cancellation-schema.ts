import type { SupabaseClient } from "@supabase/supabase-js";
import { getAvailableShippingOptionalColumns } from "@/lib/orders/shipping-schema";

export const CANCELLATION_COLUMN_NAMES = [
  "cancelled_at",
  "cancel_requested_at",
  "refund_status",
  "refund_completed_at",
  "cancellation_reason",
  "refund_method",
  "refund_upi_id",
  "refund_bank_holder_name",
  "refund_bank_account_number",
  "refund_bank_ifsc",
  "refund_bank_name",
  "refund_qr_image_url",
  "refunded_by"
] as const;

/** Fulfillment columns added in later migrations — only clear when present. */
export const FULFILLMENT_MIGRATION_COLUMN_NAMES = [
  "shipment_id",
  "delivery_status",
  "delivery_partner",
  "packed_at"
] as const;

/** Always present in base `orders` schema — safe to null on cancel. */
export const FULFILLMENT_BASE_CLEAR_COLUMN_NAMES = [
  "tracking_id",
  "courier_name",
  "shipping_date",
  "delivery_otp",
  "courier_partner"
] as const;

const CANCELLATION_SELECT = CANCELLATION_COLUMN_NAMES.join(",");

const CACHE_TTL_MS = 60_000;

let schemaCache: { ready: boolean; checkedAt: number } | null = null;
let fulfillmentColumnCache: { available: Set<string>; checkedAt: number } | null = null;

export function invalidateCancellationSchemaCache() {
  schemaCache = null;
  fulfillmentColumnCache = null;
}

export function isCancellationSchemaError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "PGRST204" ||
    error.code === "42703" ||
    msg.includes("schema cache") ||
    CANCELLATION_COLUMN_NAMES.some((col) => msg.includes(col)) ||
    FULFILLMENT_MIGRATION_COLUMN_NAMES.some((col) => msg.includes(col)) ||
    (msg.includes("column") &&
      (msg.includes("cancelled") ||
        msg.includes("cancellation") ||
        msg.includes("refund_status") ||
        msg.includes("shipment") ||
        msg.includes("delivery_status") ||
        msg.includes("delivery_partner") ||
        msg.includes("packed_at")))
  );
}

export async function isCancellationSchemaReady(db: SupabaseClient): Promise<boolean> {
  if (schemaCache && Date.now() - schemaCache.checkedAt < CACHE_TTL_MS) {
    return schemaCache.ready;
  }

  const { error } = await db.from("orders").select(CANCELLATION_SELECT).limit(0);
  const ready = !error;
  schemaCache = { ready, checkedAt: Date.now() };
  return ready;
}

export async function getAvailableFulfillmentClearColumns(
  db: SupabaseClient
): Promise<Set<string>> {
  if (fulfillmentColumnCache && Date.now() - fulfillmentColumnCache.checkedAt < CACHE_TTL_MS) {
    return fulfillmentColumnCache.available;
  }

  const available = new Set<string>(FULFILLMENT_BASE_CLEAR_COLUMN_NAMES);
  const shippingOptional = await getAvailableShippingOptionalColumns(db);
  for (const col of shippingOptional) {
    available.add(col);
  }

  for (const col of FULFILLMENT_MIGRATION_COLUMN_NAMES) {
    const { error } = await db.from("orders").select(col).limit(0);
    if (!error) available.add(col);
  }

  fulfillmentColumnCache = { available, checkedAt: Date.now() };
  return available;
}

export function stripCancellationFields<T extends Record<string, unknown>>(payload: T): T {
  const copy = { ...payload };
  for (const key of CANCELLATION_COLUMN_NAMES) {
    delete copy[key];
  }
  return copy;
}

export function stripFulfillmentMigrationFields<T extends Record<string, unknown>>(payload: T): T {
  const copy = { ...payload };
  for (const key of FULFILLMENT_MIGRATION_COLUMN_NAMES) {
    delete copy[key];
  }
  return copy;
}

export function buildMinimalCancelPayload(payload: Record<string, unknown>): Record<string, unknown> {
  return {
    status: payload.status,
    payment_status: payload.payment_status,
    updated_at: payload.updated_at,
    tracking_id: null,
    courier_name: null
  };
}
