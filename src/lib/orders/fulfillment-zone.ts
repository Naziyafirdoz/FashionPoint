import type { Order } from "@/types";
import {
  legacyFallbackBranches,
  resolveBranchShipping
} from "@/lib/shipping/branch-resolver";
import { loadActiveBranchesFromDb } from "@/lib/shipping/branch-store";
import type { ShippingAddressInput } from "@/lib/shipping/city-detection";
import type { BranchShippingResolution } from "@/lib/shipping/branch-types";

export type FulfillmentZone = "local" | "outstation";

export type FulfillmentZoneResolution = {
  zone: FulfillmentZone;
  branchId: string;
  usedDefaultBranch: boolean;
};

function addressFromOrder(
  order: Pick<Order, "shipping_address">
): ShippingAddressInput {
  const addr = order.shipping_address;
  if (!addr) return {};
  return {
    city: addr.city,
    state: addr.state,
    pincode: addr.pincode ?? addr.postal_code,
    line: addr.line ?? addr.line1,
    line1: addr.line1,
    line2: addr.line2
  };
}

export function fulfillmentZoneFromResolution(
  resolution: BranchShippingResolution
): FulfillmentZoneResolution {
  return {
    zone: resolution.tier === "local" ? "local" : "outstation",
    branchId: resolution.branch.id,
    usedDefaultBranch: resolution.usedDefaultBranch
  };
}

/**
 * Authoritative LOCAL/OUTSTATION for fulfillment-method eligibility.
 * Reuses resolveBranchShipping — does not invent a second PIN algorithm.
 */
export async function resolveFulfillmentZoneForAddress(
  address: ShippingAddressInput | null | undefined
): Promise<FulfillmentZoneResolution> {
  const branches = await loadActiveBranchesFromDb();
  const resolution = resolveBranchShipping(
    address ?? {},
    branches.length ? branches : legacyFallbackBranches()
  );
  return fulfillmentZoneFromResolution(resolution);
}

/**
 * Authoritative LOCAL/OUTSTATION for fulfillment-method eligibility.
 * Always recomputes from the customer address + ACTIVE branch service areas
 * so inactive branches never qualify an order as local.
 */
export async function resolveFulfillmentZoneForOrder(
  order: Pick<Order, "shipping_address" | "fulfillment_zone" | "branch_id">
): Promise<FulfillmentZoneResolution> {
  return resolveFulfillmentZoneForAddress(addressFromOrder(order));
}
