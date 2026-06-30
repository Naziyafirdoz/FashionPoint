import type { Product } from "@/types";
import { isProductInStock } from "@/lib/wishlist/product-stock";

const LOW_STOCK_THRESHOLD = 5;

export type ProductStockStatus = "in_stock" | "low_stock" | "out_of_stock";

export function getTotalStock(product: Product): number {
  if (product.variants && product.variants.length > 0) {
    return product.variants.reduce((sum, variant) => sum + variant.stock_quantity, 0);
  }

  if (product.stock_quantity !== undefined) {
    return product.stock_quantity;
  }

  return isProductInStock(product) ? LOW_STOCK_THRESHOLD + 1 : 0;
}

export function getProductStockStatus(product: Product): ProductStockStatus {
  const total = getTotalStock(product);

  if (total <= 0) {
    return "out_of_stock";
  }

  if (total <= LOW_STOCK_THRESHOLD) {
    return "low_stock";
  }

  return "in_stock";
}

export const STOCK_STATUS_LABEL: Record<ProductStockStatus, string> = {
  in_stock: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock"
};
