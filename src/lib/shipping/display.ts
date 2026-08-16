import { getCachedBranches } from "@/lib/shipping/branch-store";
import type { ShippingTier } from "@/lib/shipping/branch-types";
import type { ShippingLocationTier } from "@/lib/shipping/city-detection";
import { resolveBranchShipping } from "@/lib/shipping/branch-resolver";
import type { ShippingAddressInput } from "@/lib/shipping/city-detection";

/** Shown on cart/checkout before a delivery address is available. */
export const SHIPPING_BEFORE_ADDRESS_MESSAGE =
  "Shipping charges will be calculated automatically at checkout.";

export const SHIPPING_FEES_FOOTNOTE =
  "Shipping fees vary based on delivery location and branch.";

export function formatShippingCharge(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function shippingTierCustomerLabel(tier: ShippingLocationTier): string {
  if (tier === "vijayawada_city") return "Local delivery";
  return "Outstation delivery";
}

export function shippingChargeReasonForBranch(
  branchName: string,
  tier: ShippingTier,
  usedDefaultBranch: boolean
): string {
  if (tier === "local") {
    return `Your delivery address is within ${branchName} local service area.`;
  }
  if (usedDefaultBranch) {
    return `Your delivery address is outside configured branch coverage. ${branchName} standard rate applies.`;
  }
  return `Your delivery address uses ${branchName} standard shipping.`;
}

/** @deprecated Use shippingChargeReasonForBranch */
export function shippingChargeReason(tier: ShippingLocationTier): string {
  if (tier === "vijayawada_city") {
    return "Your delivery address is within Vijayawada city.";
  }
  return "Your delivery address is outside Vijayawada.";
}

export function getShippingRateCardForBranch(branchId: string) {
  const branch = getCachedBranches().find((b) => b.id === branchId);
  if (!branch) return [];
  return [
    {
      tier: "local" as const,
      label: "Local delivery",
      amount: branch.local_shipping_charge
    },
    {
      tier: "outstation" as const,
      label: "Outstation delivery",
      amount: branch.outstation_shipping_charge
    }
  ];
}

/** Rate card for checkout when address is known; falls back to default branch. */
export function getShippingRateCardForAddress(address?: ShippingAddressInput | null) {
  const resolution = resolveBranchShipping(address ?? {});
  return {
    branchId: resolution.branch.id,
    branchName: resolution.branch.name,
    rates: getShippingRateCardForBranch(resolution.branch.id)
  };
}

/** @deprecated Use getShippingRateCardForAddress */
export function getShippingRateCard() {
  const branches = getCachedBranches().filter((b) => b.is_active);
  const branch = branches.find((b) => b.is_default) ?? branches[0];
  if (!branch) {
    return [
      { tier: "vijayawada_city" as const, label: "Local delivery", amount: 99 },
      { tier: "other" as const, label: "Outstation delivery", amount: 199 }
    ];
  }
  return [
    {
      tier: "vijayawada_city" as const,
      label: "Local delivery",
      amount: branch.local_shipping_charge
    },
    {
      tier: "other" as const,
      label: "Outstation delivery",
      amount: branch.outstation_shipping_charge
    }
  ];
}
