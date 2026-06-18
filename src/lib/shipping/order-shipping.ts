import { buildShippingQuote } from "@/lib/shipping/rates";

export type OrderAddressInput = {
  city?: string;
  state?: string;
  pincode?: string;
  line?: string;
  line1?: string;
  line2?: string;
};

export function resolveServerShippingAmount(address: OrderAddressInput | null | undefined): number {
  if (!address) return buildShippingQuote({}).shippingAmount;
  return buildShippingQuote(address).shippingAmount;
}

export function assertClientShippingAmount(
  clientAmount: number,
  address: OrderAddressInput | null | undefined
): { ok: true; shippingAmount: number } | { ok: false; error: string } {
  const expected = resolveServerShippingAmount(address);
  if (Math.abs(clientAmount - expected) > 0.01) {
    return {
      ok: false,
      error: `Shipping amount mismatch. Expected ₹${expected}, received ₹${clientAmount}.`
    };
  }
  return { ok: true, shippingAmount: expected };
}
