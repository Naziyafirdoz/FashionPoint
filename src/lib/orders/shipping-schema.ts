import type { SupabaseClient } from "@supabase/supabase-js";

/** Present in base `orders` schema — always written on ship. */
export const SHIPPING_CORE_COLUMN_NAMES = ["tracking_id", "courier_name"] as const;

/** Added in later migrations — probed before write. */
export const SHIPPING_OPTIONAL_COLUMN_NAMES = [
  "tracking_number",
  "courier_partner",
  "shipping_date",
  "delivery_otp"
] as const;

const SHIPPING_OPTIONAL_SELECT = SHIPPING_OPTIONAL_COLUMN_NAMES.join(",");

const CACHE_TTL_MS = 60_000;

type OptionalColumnCache = {
  available: Set<string>;
  checkedAt: number;
};

let optionalColumnCache: OptionalColumnCache | null = null;

export function invalidateShippingSchemaCache() {
  optionalColumnCache = null;
}

export function isShippingSchemaError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "PGRST204" ||
    error.code === "42703" ||
    msg.includes("schema cache") ||
    SHIPPING_OPTIONAL_COLUMN_NAMES.some((col) => msg.includes(col)) ||
    (msg.includes("column") &&
      (msg.includes("tracking") || msg.includes("courier") || msg.includes("shipping") || msg.includes("delivery_otp")))
  );
}

async function probeOptionalShippingColumns(db: SupabaseClient): Promise<Set<string>> {
  const available = new Set<string>();

  const { error: batchError } = await db
    .from("orders")
    .select(SHIPPING_OPTIONAL_SELECT)
    .limit(0);

  if (!batchError) {
    for (const col of SHIPPING_OPTIONAL_COLUMN_NAMES) {
      available.add(col);
    }
    return available;
  }

  for (const col of SHIPPING_OPTIONAL_COLUMN_NAMES) {
    const { error } = await db.from("orders").select(col).limit(0);
    if (!error) available.add(col);
  }

  return available;
}

export async function getAvailableShippingOptionalColumns(
  db: SupabaseClient
): Promise<Set<string>> {
  if (optionalColumnCache && Date.now() - optionalColumnCache.checkedAt < CACHE_TTL_MS) {
    return optionalColumnCache.available;
  }

  const available = await probeOptionalShippingColumns(db);
  optionalColumnCache = { available, checkedAt: Date.now() };
  return available;
}

export type BuildShipPayloadInput = {
  trackingNumber: string;
  courierPartner: string;
  shippingDate: string;
  deliveryOtp: string;
  optionalColumns: Set<string>;
};

export function buildShipUpdatePayload(input: BuildShipPayloadInput): Record<string, unknown> {
  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    status: "shipped",
    delivery_status: "shipped",
    tracking_id: input.trackingNumber,
    courier_name: input.courierPartner || null,
    updated_at: now
  };

  if (input.optionalColumns.has("tracking_number")) {
    payload.tracking_number = input.trackingNumber;
  }
  if (input.optionalColumns.has("courier_partner")) {
    payload.courier_partner = input.courierPartner || null;
  }
  if (input.optionalColumns.has("shipping_date")) {
    payload.shipping_date = input.shippingDate;
  }
  if (input.optionalColumns.has("delivery_otp")) {
    payload.delivery_otp = input.deliveryOtp;
  }

  return payload;
}

/** Minimal payload using only base-schema columns. */
export function buildMinimalShipUpdatePayload(
  trackingNumber: string,
  courierPartner: string
): Record<string, unknown> {
  return {
    status: "shipped",
    tracking_id: trackingNumber,
    courier_name: courierPartner || null,
    updated_at: new Date().toISOString()
  };
}

export function stripOptionalShippingFields<T extends Record<string, unknown>>(payload: T): T {
  const copy = { ...payload };
  for (const key of SHIPPING_OPTIONAL_COLUMN_NAMES) {
    delete copy[key];
  }
  return copy;
}
