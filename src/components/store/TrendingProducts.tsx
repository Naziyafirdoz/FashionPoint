import type { Product } from "@/types";
import { ProductGrid } from "./ProductGrid";

type Props = {
  products: Product[];
};

export function TrendingProducts({ products }: Props) {
  if (!products.length) {
    return <p className="mt-6 text-sm text-foreground/60">No products available.</p>;
  }

  return <ProductGrid products={products} />;
}
