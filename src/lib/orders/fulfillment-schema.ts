import type { SupabaseClient } from "@supabase/supabase-js";

/** New fulfillment columns — probed before write for pre-migration DBs. */
export const FULFILLMENT_OPTIONAL_COLUMN_NAMES = [
  "fulfillment_zone",
  "fulfillment_method",
  "assigned_delivery_worker_id"
] as const;

const CACHE_TTL_MS = 60_000;

let cache: { available: Set<string>; checkedAt: number } | null = null;

export function invalidateFulfillmentSchemaCache() {
  cache = null;
}

async function probe(db: SupabaseClient): Promise<Set<string>> {
  const available = new Set<string>();
  const select = FULFILLMENT_OPTIONAL_COLUMN_NAMES.join(",");
  const { error: batchError } = await db.from("orders").select(select).limit(0);
  if (!batchError) {
    for (const col of FULFILLMENT_OPTIONAL_COLUMN_NAMES) available.add(col);
    return available;
  }
  for (const col of FULFILLMENT_OPTIONAL_COLUMN_NAMES) {
    const { error } = await db.from("orders").select(col).limit(0);
    if (!error) available.add(col);
  }
  return available;
}

export async function getAvailableFulfillmentColumns(
  db: SupabaseClient
): Promise<Set<string>> {
  if (cache && Date.now() - cache.checkedAt < CACHE_TTL_MS) {
    return cache.available;
  }
  const available = await probe(db);
  cache = { available, checkedAt: Date.now() };
  return available;
}

export function isFulfillmentSchemaError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "PGRST204" ||
    error.code === "42703" ||
    FULFILLMENT_OPTIONAL_COLUMN_NAMES.some((col) => msg.includes(col))
  );
}
