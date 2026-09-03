import type { Product } from "@/types";
import type { ProductOfferPricing } from "./types";

export function resolveProductOfferPricing(
  product: Product,
  variantId?: string | null
): ProductOfferPricing | null {
  if (variantId && product.variantOfferPricing?.[variantId]) {
    return product.variantOfferPricing[variantId];
  }
  return product.offerPricing ?? null;
}

export function hasAppliedOffer(pricing: ProductOfferPricing | null | undefined): boolean {
  return Boolean(pricing?.appliedOffer && (pricing.discountPerUnit ?? 0) > 0);
}

export function offerDiscountLabel(pricing: ProductOfferPricing): string | null {
  const offer = pricing.appliedOffer;
  if (!offer || pricing.discountPerUnit <= 0) return null;
  if (offer.discountType === "percentage") {
    return `${offer.discountValue}% off`;
  }
  return `₹${Number(offer.discountValue).toLocaleString("en-IN")} off`;
}
