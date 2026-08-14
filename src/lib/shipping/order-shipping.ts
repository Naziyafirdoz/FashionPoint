import { buildShippingQuote } from "@/lib/shipping/rates";
import type { BranchShippingResolution } from "@/lib/shipping/branch-types";
import { legacyFallbackBranches, resolveBranchShipping } from "@/lib/shipping/branch-resolver";
import { loadActiveBranchesFromDb } from "@/lib/shipping/branch-store";

export type OrderAddressInput = {
  city?: string;
  state?: string;
  pincode?: string;
  line?: string;
  line1?: string;
  line2?: string;
};

export function resolveServerShipping(address: OrderAddressInput | null | undefined): BranchShippingResolution {
  if (!address) {
    return resolveBranchShipping({});
  }
  return resolveBranchShipping(address);
}

export function resolveServerShippingAmount(address: OrderAddressInput | null | undefined): number {
  return resolveServerShipping(address).shippingAmount;
}

/**
 * Customer-facing checkout pricing must be based on the current database
 * snapshot, not the module cache used by legacy display helpers.
 */
export async function resolveAuthoritativeShipping(
  address: OrderAddressInput | null | undefined
): Promise<BranchShippingResolution> {
  const branches = await loadActiveBranchesFromDb();
  return resolveBranchShipping(address ?? {}, branches.length ? branches : legacyFallbackBranches());
}

export async function assertAuthoritativeClientShippingAmount(
  clientAmount: number,
  address: OrderAddressInput | null | undefined
): Promise<{ ok: true; shippingAmount: number; branchId: string } | { ok: false; error: string }> {
  const resolution = await resolveAuthoritativeShipping(address);
  const expected = resolution.shippingAmount;
  if (Math.abs(clientAmount - expected) > 0.01) {
    return {
      ok: false,
      error: `Shipping amount mismatch. Expected ₹${expected}, received ₹${clientAmount}.`
    };
  }
  return { ok: true, shippingAmount: expected, branchId: resolution.branch.id };
}

export function assertClientShippingAmount(
  clientAmount: number,
  address: OrderAddressInput | null | undefined
): { ok: true; shippingAmount: number; branchId: string } | { ok: false; error: string } {
  const resolution = resolveServerShipping(address);
  const expected = resolution.shippingAmount;
  if (Math.abs(clientAmount - expected) > 0.01) {
    return {
      ok: false,
      error: `Shipping amount mismatch. Expected ₹${expected}, received ₹${clientAmount}.`
    };
  }
  return { ok: true, shippingAmount: expected, branchId: resolution.branch.id };
}

export { buildShippingQuote };
