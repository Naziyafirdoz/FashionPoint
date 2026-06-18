import { createServiceClient } from "@/lib/supabase";
import {
  applyShippingSettingsOverrides,
  DEFAULT_SHIPPING_SETTINGS,
  type ShippingSettings
} from "@/lib/shipping/settings";

const SETTINGS_KEY = "shipping";

type StoredShippingSettings = Partial<ShippingSettings>;

export async function loadShippingSettingsFromDb(): Promise<ShippingSettings> {
  const db = createServiceClient();
  if (!db) return DEFAULT_SHIPPING_SETTINGS;

  const { data } = await db
    .from("store_settings")
    .select("value")
    .eq("key", SETTINGS_KEY)
    .maybeSingle();

  if (!data?.value || typeof data.value !== "object") {
    return DEFAULT_SHIPPING_SETTINGS;
  }

  const stored = data.value as StoredShippingSettings;
  return { ...DEFAULT_SHIPPING_SETTINGS, ...stored };
}

export async function saveShippingSettingsToDb(
  settings: Partial<ShippingSettings>
): Promise<{ ok: boolean; error?: string }> {
  const db = createServiceClient();
  if (!db) return { ok: false, error: "Database not configured" };

  const current = await loadShippingSettingsFromDb();
  const merged = { ...current, ...settings };

  const { error } = await db.from("store_settings").upsert({
    key: SETTINGS_KEY,
    value: {
      localShippingCharge: merged.localShippingCharge,
      outstationShippingCharge: merged.outstationShippingCharge,
      defaultPackageWeightKg: merged.defaultPackageWeightKg,
      deliveryProvider: merged.deliveryProvider,
      storePickupAddress: merged.storePickupAddress,
      storePickupCity: merged.storePickupCity,
      storePickupPincode: merged.storePickupPincode,
      storePickupPhone: merged.storePickupPhone
    },
    updated_at: new Date().toISOString()
  });

  if (error) return { ok: false, error: error.message };

  applyShippingSettingsOverrides(merged);
  return { ok: true };
}

export async function hydrateShippingSettings(): Promise<ShippingSettings> {
  const settings = await loadShippingSettingsFromDb();
  applyShippingSettingsOverrides(settings);
  return settings;
}
