import type { Product } from "@/types";

export function isProductInStock(product: Product): boolean {
  if (product.variants && product.variants.length > 0) {
    return product.variants.some((variant) => variant.stock_quantity > 0);
  }

  if (product.stock_quantity !== undefined) {
    return product.stock_quantity > 0;
  }

  return product.status !== "out_of_stock" && product.status !== "archived";
}

export function isProductReadyForPurchase(product: Product): boolean {
  return product.is_active !== false && isProductInStock(product);
}
