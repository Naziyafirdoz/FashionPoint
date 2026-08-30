import type { SupabaseClient } from "@supabase/supabase-js";
import type { Product } from "@/types";
import { evaluateOffer } from "./evaluate";
import { loadOfferCandidates } from "./get-eligible-offers";
import type { OfferCandidate, OfferEvaluationResult, ProductOfferPricing } from "./types";

export function productCategoryId(product: Product): string | null {
  if (typeof product.category_id === "string" && product.category_id.trim()) {
    return product.category_id;
  }
  if (product.category?.id) return product.category.id;
  return null;
}

function toProductOfferPricing(result: OfferEvaluationResult): ProductOfferPricing {
  return {
    basePrice: result.basePrice,
    effectivePrice: result.effectivePrice,
    discountPerUnit: result.discountPerUnit,
    appliedOffer: result.appliedOffer
  };
}

export function attachOfferPricingToProducts(
  products: Product[],
  offers: OfferCandidate[],
  now?: Date
): Product[] {
  return products.map((product) => {
    const categoryId = productCategoryId(product);
    const offerPricing = toProductOfferPricing(
      evaluateOffer({
        productId: product.id,
        categoryId,
        catalogUnitPrice: product.price,
        now,
        offers
      })
    );

    const variantOfferPricing: Record<string, ProductOfferPricing> = {};
    for (const variant of product.variants ?? []) {
      const unit = variant.price != null ? Number(variant.price) : product.price;
      variantOfferPricing[variant.id] = toProductOfferPricing(
        evaluateOffer({
          productId: product.id,
          categoryId,
          catalogUnitPrice: unit,
          now,
          offers
        })
      );
    }

    return {
      ...product,
      offerPricing,
      variantOfferPricing
    };
  });
}

export async function withProductOfferPricing(
  db: SupabaseClient,
  products: Product[],
  now?: Date
): Promise<Product[]> {
  if (products.length === 0) return products;

  const productIds = products.map((product) => product.id);
  const categoryIds = [
    ...new Set(products.map(productCategoryId).filter((id): id is string => Boolean(id)))
  ];
  const offers = await loadOfferCandidates(db, { now, productIds, categoryIds });
  return attachOfferPricingToProducts(products, offers, now);
}

