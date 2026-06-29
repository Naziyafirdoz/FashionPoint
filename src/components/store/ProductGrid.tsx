"use client";

import type { Product } from "@/types";
import { useProductReviewSummaries } from "@/hooks/useProductReviewSummaries";
import { ProductCard } from "./ProductCard";

export function ProductGrid({
  products,
  layout = "default",
  viewMode = "grid"
}: {
  products: Product[];
  layout?: "default" | "collection" | "boutique";
  viewMode?: "grid" | "list";
}) {
  const productIds = products.map((product) => product.id);
  const { summaries } = useProductReviewSummaries(productIds);

  const isList = viewMode === "list";
  const cardVariant = layout === "default" ? "default" : "collection";

  const gridClassName = (() => {
    if (isList) return "grid grid-cols-1 gap-4";
    if (layout === "boutique") {
      return "grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4";
    }
    if (layout === "collection") {
      return "grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4";
    }
    return "mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4";
  })();

  return (
    <div className={gridClassName}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          reviewSummary={summaries[product.id]}
          variant={cardVariant}
          listView={isList && cardVariant === "collection"}
        />
      ))}
    </div>
  );
}
