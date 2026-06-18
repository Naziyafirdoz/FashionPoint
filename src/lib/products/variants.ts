import type { Product, ProductVariant } from "@/types";

export function findProductVariant(
  variants: ProductVariant[] | undefined,
  size: string,
  color: string
): ProductVariant | undefined {
  return variants?.find((v) => v.size === size && v.color === color);
}

export type ResolvedVariantDisplay = {
  price: number;
  compare_price?: number;
  sku?: string;
  stock_quantity: number;
  inStock: boolean;
};

/** Falls back to product-level fields when variant data is missing (legacy products). */
export function resolveVariantDisplay(
  product: Product,
  size: string,
  color: string
): ResolvedVariantDisplay {
  const variant = findProductVariant(product.variants, size, color);
  const price = variant?.price ?? product.price;
  const compare_price = variant?.compare_price ?? product.compare_price;
  const stock_quantity =
    variant != null ? variant.stock_quantity : Number(product.stock_quantity ?? 0);
  const sku = variant?.sku ?? product.sku;

  return {
    price,
    compare_price,
    sku,
    stock_quantity,
    inStock: stock_quantity > 0
  };
}

export function isSizeUnavailableForColor(
  product: Product,
  size: string,
  color: string
): boolean {
  return !resolveVariantDisplay(product, size, color).inStock;
}

export function discountPercent(price: number, comparePrice?: number): number {
  if (!comparePrice || comparePrice <= price) return 0;
  return Math.round(((comparePrice - price) / comparePrice) * 100);
}
