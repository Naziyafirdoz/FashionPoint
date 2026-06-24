import { STORE_ADDRESS, siteConfig } from "@/lib/site-config";

export type DeliveryProviderId = "mock" | "rapido";

export type ShippingSettings = {
  localShippingCharge: number;
  outstationShippingCharge: number;
  storePickupAddress: string;
  storePickupCity: string;
  storePickupPincode: string;
  storePickupPhone: string;
  defaultPackageWeightKg: number;
  deliveryProvider: DeliveryProviderId;
  rapidoApiKey: string;
  rapidoApiSecret: string;
};

export const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = {
  localShippingCharge: 99,
  outstationShippingCharge: 200,
  storePickupAddress: STORE_ADDRESS,
  storePickupCity: siteConfig.city,
  storePickupPincode: siteConfig.pincode,
  storePickupPhone: siteConfig.phone1,
  defaultPackageWeightKg: 0.5,
  deliveryProvider:
    (process.env.DELIVERY_PROVIDER as DeliveryProviderId | undefined) ?? "mock",
  rapidoApiKey: process.env.RAPIDO_API_KEY ?? "",
  rapidoApiSecret: process.env.RAPIDO_API_SECRET ?? ""
};

let runtimeOverrides: Partial<ShippingSettings> = {};

export function getShippingSettings(): ShippingSettings {
  return { ...DEFAULT_SHIPPING_SETTINGS, ...runtimeOverrides };
}

export function applyShippingSettingsOverrides(overrides: Partial<ShippingSettings>): void {
  runtimeOverrides = { ...runtimeOverrides, ...overrides };
}

export function resetShippingSettingsOverrides(): void {
  runtimeOverrides = {};
}
