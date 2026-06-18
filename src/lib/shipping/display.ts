import type { ShippingLocationTier } from "@/lib/shipping/city-detection";
import { getShippingSettings } from "@/lib/shipping/settings";

/** Shown on cart/checkout before a delivery address is available. */
export const SHIPPING_BEFORE_ADDRESS_MESSAGE =
  "Shipping charges will be calculated automatically at checkout.";

export const SHIPPING_FEES_FOOTNOTE =
  "Shipping fees vary based on delivery location.";

export function formatShippingCharge(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function shippingTierCustomerLabel(tier: ShippingLocationTier): string {
  if (tier === "vijayawada_city") return "Vijayawada city";
  return "All other locations";
}

export function shippingChargeReason(tier: ShippingLocationTier): string {
  if (tier === "vijayawada_city") {
    return "Your delivery address is within Vijayawada city.";
  }
  return "Your delivery address is outside Vijayawada.";
}

export function getShippingRateCard() {
  const settings = getShippingSettings();
  return [
    {
      tier: "vijayawada_city" as const,
      label: "Vijayawada city",
      amount: settings.localShippingCharge
    },
    {
      tier: "other" as const,
      label: "All other locations",
      amount: settings.outstationShippingCharge
    }
  ];
}
