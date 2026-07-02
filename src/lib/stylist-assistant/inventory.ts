import type { Product } from "@/types";

export function productTotalStock(product: Product): number {
  const variants = product.variants ?? [];
  if (variants.length > 0) {
    return variants.reduce((sum, variant) => sum + (variant.stock_quantity ?? 0), 0);
  }
  return Number(product.stock_quantity ?? 0);
}

export function isProductInStock(product: Product): boolean {
  if (product.status === "out_of_stock") return false;
  return productTotalStock(product) > 0;
}
