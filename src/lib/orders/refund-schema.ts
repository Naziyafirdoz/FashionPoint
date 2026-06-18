import type { SupabaseClient } from "@supabase/supabase-js";

/** Columns from `20260614_order_refund_fields.sql` — required for refund tracking. */
export const REFUND_CORE_COLUMN_NAMES = [
  "refund_amount",
  "refund_date",
  "refund_reference",
  "refund_notes",
  "refund_initiated_at"
] as const;

/** Added in later migrations — optional; UI computes fallback from `refund_initiated_at`. */
export const REFUND_OPTIONAL_COLUMN_NAMES = ["expected_refund_date"] as const;

export const REFUND_COLUMN_NAMES = [
  ...REFUND_CORE_COLUMN_NAMES,
  ...REFUND_OPTIONAL_COLUMN_NAMES
] as const;

const REFUND_CORE_SELECT = REFUND_CORE_COLUMN_NAMES.join(",");
const REFUND_OPTIONAL_SELECT = REFUND_OPTIONAL_COLUMN_NAMES.join(",");

const CACHE_TTL_MS = 60_000;

type RefundSchemaProbe = {
  coreReady: boolean;
  optionalReady: boolean;
  checkedAt: number;
};

let schemaCache: RefundSchemaProbe | null = null;

export function invalidateRefundSchemaCache() {
  schemaCache = null;
}

export function isRefundSchemaError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "PGRST204" ||
    error.code === "42703" ||
    msg.includes("schema cache") ||
    msg.includes("refund_amount") ||
    msg.includes("refund_date") ||
    msg.includes("refund_reference") ||
    msg.includes("refund_notes") ||
    msg.includes("refund_initiated_at") ||
    msg.includes("expected_refund_date") ||
    (msg.includes("column") && msg.includes("refund"))
  );
}

async function runRefundSchemaProbe(
  db: SupabaseClient
): Promise<Pick<RefundSchemaProbe, "coreReady" | "optionalReady">> {
  const { error: coreError } = await db.from("orders").select(REFUND_CORE_SELECT).limit(0);

  if (coreError) {
    return { coreReady: false, optionalReady: false };
  }

  const { error: optionalError } = await db
    .from("orders")
    .select(REFUND_OPTIONAL_SELECT)
    .limit(0);

  return {
    coreReady: true,
    optionalReady: !optionalError
  };
}

async function getRefundSchemaProbe(db: SupabaseClient): Promise<RefundSchemaProbe> {
  if (schemaCache && Date.now() - schemaCache.checkedAt < CACHE_TTL_MS) {
    return schemaCache;
  }

  const probe = await runRefundSchemaProbe(db);
  schemaCache = { ...probe, checkedAt: Date.now() };
  return schemaCache;
}

/** True when core refund columns exist — enables refund UI and APIs. */
export async function isRefundSchemaReady(db: SupabaseClient): Promise<boolean> {
  const probe = await getRefundSchemaProbe(db);
  return probe.coreReady;
}

/** True when `expected_refund_date` column exists (optional v2 migration). */
export async function isRefundOptionalSchemaReady(db: SupabaseClient): Promise<boolean> {
  const probe = await getRefundSchemaProbe(db);
  return probe.coreReady && probe.optionalReady;
}

export function stripRefundFields<T extends Record<string, unknown>>(payload: T): T {
  const copy = { ...payload };
  for (const key of REFUND_COLUMN_NAMES) {
    delete copy[key];
  }
  return copy;
}

export function stripOptionalRefundFields<T extends Record<string, unknown>>(payload: T): T {
  const copy = { ...payload };
  for (const key of REFUND_OPTIONAL_COLUMN_NAMES) {
    delete copy[key];
  }
  return copy;
}

export const REFUND_MIGRATION_UNAVAILABLE = "Refund database migration not applied.";

export function refundMigrationResponse() {
  return {
    success: false as const,
    message: REFUND_MIGRATION_UNAVAILABLE
  };
}
