import { resolveBranchShipping } from "@/lib/shipping/branch-resolver";
import { getShippingSettings } from "@/lib/shipping/settings";
import { shippingChargeReasonForBranch } from "@/lib/shipping/display";
import type { ShippingTier } from "@/lib/shipping/branch-types";
import type { ShippingAddressInput, ShippingLocationTier, ShippingZone } from "@/lib/shipping/city-detection";

export type ShippingQuote = {
  shippingAmount: number;
  zone: ShippingZone;
  /** @deprecated Use `tier` — kept for checkout compatibility */
  locationTier: ShippingLocationTier;
  tier: ShippingTier;
  city: string;
  isLocal: boolean;
  chargeReason: string;
  message: string;
  branchId: string;
  branchName: string;
  branchSlug: string;
  usedDefaultBranch: boolean;
};

export function computeShippingChargeForAddress(address: ShippingAddressInput): number {
  return resolveBranchShipping(address).shippingAmount;
}

export function buildShippingQuote(address: ShippingAddressInput): ShippingQuote {
  const resolution = resolveBranchShipping(address);
  const { branch, tier, shippingAmount, usedDefaultBranch } = resolution;
  const zone: ShippingZone = tier === "local" ? "local" : "outstation";
  const locationTier: ShippingLocationTier =
    branch.slug === "vijayawada" && tier === "local" ? "vijayawada_city" : "other";

  return {
    shippingAmount,
    zone,
    locationTier,
    tier,
    city: address.city?.trim() || branch.city,
    isLocal: tier === "local",
    chargeReason: shippingChargeReasonForBranch(branch.name, tier, usedDefaultBranch),
    message: "Shipping charges are calculated automatically based on your delivery address.",
    branchId: branch.id,
    branchName: branch.name,
    branchSlug: branch.slug,
    usedDefaultBranch
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
