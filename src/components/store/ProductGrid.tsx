"use client";

import type { Product } from "@/types";
import { useProductReviewSummaries } from "@/hooks/useProductReviewSummaries";
import { ProductCard } from "./ProductCard";

export function ProductGrid({ products }: { products: Product[] }) {
  const productIds = products.map((product) => product.id);
  const { summaries } = useProductReviewSummaries(productIds);

  return (
    <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} reviewSummary={summaries[product.id]} />
      ))}
    </div>
  );
}
