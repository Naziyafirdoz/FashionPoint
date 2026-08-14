import { buildShippingQuote } from "@/lib/shipping/rates";
import { resolveBranchShipping } from "@/lib/shipping/branch-resolver";
import { SHIPPING_BEFORE_ADDRESS_MESSAGE } from "@/lib/shipping/display";
import type { ShippingAddressInput } from "@/lib/shipping/city-detection";
import type { CartItem } from "@/types";

export type CheckoutAddressLike = ShippingAddressInput & {
  name?: string;
  phone?: string;
  email?: string;
};

export function itemsSubtotal(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function computeCheckoutTotals(
  items: CartItem[],
  discount: number,
  address?: CheckoutAddressLike | null
) {
  const subtotal = itemsSubtotal(items);
  const quote = address
    ? buildShippingQuote(address)
    : (() => {
        const fallbackResolution = resolveBranchShipping({});
        const { branch, usedDefaultBranch } = fallbackResolution;
        return {
          shippingAmount: 0,
          zone: "outstation" as const,
          locationTier: "other" as const,
          city: "",
          isLocal: false,
          chargeReason: "",
          message: SHIPPING_BEFORE_ADDRESS_MESSAGE,
          tier: "outstation" as const,
          branchId: branch.id,
          branchName: branch.name,
          branchSlug: branch.slug,
          usedDefaultBranch
        };
      })();

  const shippingAmount = quote.shippingAmount;
  const total = Math.max(0, subtotal + shippingAmount - discount);

  return {
    subtotal,
    discount,
    shippingAmount,
    total,
    quote,
    hasAddress: Boolean(address?.city || address?.pincode || address?.line)
  };
}
