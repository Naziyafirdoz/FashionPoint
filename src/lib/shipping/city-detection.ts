import { resolveBranchShipping } from "@/lib/shipping/branch-resolver";
import { normalizePincode } from "@/lib/shipping/pincode-lookup";

export type ShippingAddressInput = {
  city?: string;
  state?: string;
  pincode?: string;
  line?: string;
  line1?: string;
  line2?: string;
};

export function detectDeliveryCity(address: ShippingAddressInput): string {
  const resolution = resolveBranchShipping(address);
  if (resolution.tier === "local" && !resolution.usedDefaultBranch) {
    return resolution.branch.city;
  }
  return address.city?.trim() ?? "";
}

export type ShippingLocationTier = "vijayawada_city" | "other";

export function resolveShippingLocationTier(address: ShippingAddressInput): ShippingLocationTier {
  const resolution = resolveBranchShipping(address);
  if (resolution.branch.slug === "vijayawada" && resolution.tier === "local") {
    return "vijayawada_city";
  }
  return "other";
}

export function isVijayawadaDelivery(address: ShippingAddressInput): boolean {
  const resolution = resolveBranchShipping(address);
  return resolution.branch.slug === "vijayawada" && resolution.tier === "local";
}

export type ShippingZone = "local" | "outskirts" | "outstation";

export function resolveShippingZone(address: ShippingAddressInput): ShippingZone {
  const resolution = resolveBranchShipping(address);
  return resolution.tier === "local" ? "local" : "outstation";
}

/** Normalize pincode for branch lookups (re-export for convenience). */
export { normalizePincode };
