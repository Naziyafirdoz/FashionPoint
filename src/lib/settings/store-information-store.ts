import { createServiceClient } from "@/lib/supabase";
import {
  fetchStoreInformation,
  STORE_INFORMATION_KEY,
  storeInformationWriteValue,
  type StoreInformation
} from "@/lib/settings/store-information";

export async function loadStoreInformationFromDb(): Promise<StoreInformation> {
  return fetchStoreInformation();
}

export async function saveStoreInformationToDb(
  input: StoreInformation
): Promise<{ ok: true; settings: StoreInformation } | { ok: false; error: string }> {
  const db = createServiceClient();
  if (!db) return { ok: false, error: "Database not configured" };

  const value = storeInformationWriteValue(input);

  const { error } = await db.from("store_settings").upsert({
    key: STORE_INFORMATION_KEY,
    value,
    updated_at: new Date().toISOString()
  });

  if (error) return { ok: false, error: error.message };

  return { ok: true, settings: value };
}
