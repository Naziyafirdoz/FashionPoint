import { getShippingSettings } from "@/lib/shipping/settings";
import {
  detectDeliveryCity,
  resolveShippingLocationTier,
  resolveShippingZone,
  type ShippingAddressInput,
  type ShippingLocationTier,
  type ShippingZone
} from "@/lib/shipping/city-detection";
import { shippingChargeReason } from "@/lib/shipping/display";

export type ShippingQuote = {
  shippingAmount: number;
  zone: ShippingZone;
  locationTier: ShippingLocationTier;
  city: string;
  isLocal: boolean;
  chargeReason: string;
  message: string;
};

export function computeShippingChargeForAddress(address: ShippingAddressInput): number {
  const settings = getShippingSettings();
  const tier = resolveShippingLocationTier(address);
  return tier === "vijayawada_city"
    ? settings.localShippingCharge
    : settings.outstationShippingCharge;
}

export function buildShippingQuote(address: ShippingAddressInput): ShippingQuote {
  const zone = resolveShippingZone(address);
  const locationTier = resolveShippingLocationTier(address);
  const shippingAmount = computeShippingChargeForAddress(address);
  const city = detectDeliveryCity(address) || (locationTier === "vijayawada_city" ? "Vijayawada" : "");

  return {
    shippingAmount,
    zone,
    locationTier,
    city,
    isLocal: locationTier === "vijayawada_city",
    chargeReason: shippingChargeReason(locationTier),
    message: "Shipping charges are calculated automatically based on your delivery address."
  };
}

/** Admin/internal only — not shown in customer checkout UI. */
export function estimateDeliveryWindow(zone: ShippingZone): {
  label: string;
  minDays: number;
  maxDays: number;
} {
  if (zone === "local") {
    return { label: "Same day or next business day", minDays: 0, maxDays: 1 };
  }
  return { label: "Standard delivery", minDays: 2, maxDays: 2 };
}

/** @deprecated Use buildShippingQuote(address).shippingAmount — subtotal no longer affects shipping. */
export function computeShippingAmount(_subtotal: number, _shipping?: string): number {
  return getShippingSettings().outstationShippingCharge;
}
