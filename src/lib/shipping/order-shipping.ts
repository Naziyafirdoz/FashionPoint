import { buildShippingQuote } from "@/lib/shipping/rates";
import type { BranchShippingResolution } from "@/lib/shipping/branch-types";
import { resolveBranchShipping } from "@/lib/shipping/branch-resolver";

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
