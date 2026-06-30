import type { ProductSortValue } from "@/lib/products/catalog-sort";
import type { Product } from "@/types";

export type WishlistEntry = {
  wishlistId: string;
  productId: string;
  createdAt: string;
  product: Product;
};

export function sortWishlistEntries(
  entries: WishlistEntry[],
  sort: ProductSortValue
): WishlistEntry[] {
  const sorted = [...entries];

  switch (sort) {
    case "price_asc":
      return sorted.sort((a, b) => a.product.price - b.product.price);
    case "price_desc":
      return sorted.sort((a, b) => b.product.price - a.product.price);
    case "bestselling":
      return sorted.sort((a, b) => {
        const bestsellerDiff =
          Number(b.product.is_bestseller) - Number(a.product.is_bestseller);
        if (bestsellerDiff !== 0) return bestsellerDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    case "featured":
      return sorted.sort((a, b) => {
        const featuredDiff = Number(b.product.is_featured) - Number(a.product.is_featured);
        if (featuredDiff !== 0) return featuredDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    case "latest":
    default:
      return sorted.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }
}
