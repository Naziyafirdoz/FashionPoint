import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import {
  DEFAULT_SHIPPING_SETTINGS,
  getShippingSettings,
  type ShippingSettings
} from "@/lib/shipping/settings";
import {
  hydrateShippingSettings,
  loadShippingSettingsFromDb,
  saveShippingSettingsToDb
} from "@/lib/shipping/settings-store";

function publicSettings(settings: ShippingSettings) {
  return {
    localShippingCharge: settings.localShippingCharge,
    outstationShippingCharge: settings.outstationShippingCharge,
    storePickupAddress: settings.storePickupAddress,
    storePickupCity: settings.storePickupCity,
    storePickupPincode: settings.storePickupPincode,
    storePickupPhone: settings.storePickupPhone,
    defaultPackageWeightKg: settings.defaultPackageWeightKg,
    deliveryProvider: settings.deliveryProvider,
    rapidoConfigured: Boolean(settings.rapidoApiKey)
  };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const settings = await loadShippingSettingsFromDb();
  return NextResponse.json({
    settings: publicSettings(settings),
    defaults: publicSettings(DEFAULT_SHIPPING_SETTINGS)
  });
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const patch: Partial<ShippingSettings> = {};

  if (typeof body.localShippingCharge === "number") {
    patch.localShippingCharge = body.localShippingCharge;
  }
  if (typeof body.outstationShippingCharge === "number") {
    patch.outstationShippingCharge = body.outstationShippingCharge;
  }
  if (typeof body.storePickupAddress === "string") {
    patch.storePickupAddress = body.storePickupAddress;
  }
  if (typeof body.storePickupCity === "string") {
    patch.storePickupCity = body.storePickupCity;
  }
  if (typeof body.storePickupPincode === "string") {
    patch.storePickupPincode = body.storePickupPincode;
  }
  if (typeof body.storePickupPhone === "string") {
    patch.storePickupPhone = body.storePickupPhone;
  }
  if (typeof body.defaultPackageWeightKg === "number") {
    patch.defaultPackageWeightKg = body.defaultPackageWeightKg;
  }
  if (body.deliveryProvider === "mock" || body.deliveryProvider === "rapido") {
    patch.deliveryProvider = body.deliveryProvider;
  }

  const result = await saveShippingSettingsToDb(patch);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Failed to save settings" }, { status: 500 });
  }

  await hydrateShippingSettings();
  return NextResponse.json({ settings: publicSettings(getShippingSettings()) });
}
