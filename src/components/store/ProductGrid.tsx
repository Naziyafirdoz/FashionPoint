"use client";

import { useState } from "react";
import type { Product } from "@/types";
import { useProductReviewSummaries } from "@/hooks/useProductReviewSummaries";
import { OutOfStockModal } from "./OutOfStockModal";
import { ProductCard } from "./ProductCard";

export function ProductGrid({
  products,
  layout = "default",
  viewMode = "grid"
}: {
  products: Product[];
  layout?: "default" | "collection" | "boutique" | "listing" | "recommendation";
  viewMode?: "grid" | "list";
}) {
  const productIds = products.map((product) => product.id);
  const { summaries } = useProductReviewSummaries(productIds);
  const [notifyProduct, setNotifyProduct] = useState<Product | null>(null);

  const isList = viewMode === "list";
  const cardVariant =
    layout === "recommendation"
      ? "recommendation"
      : layout === "default"
        ? "default"
        : layout === "listing"
          ? "listing"
          : "collection";

  const gridClassName = (() => {
    if (isList) return "grid w-full min-w-0 grid-cols-1 gap-4";
    if (layout === "recommendation") {
      return "grid w-full min-w-0 grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 md:gap-7 lg:grid-cols-4";
    }
    if (layout === "listing") {
      return "grid w-full min-w-0 grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4";
    }
    if (layout === "boutique" || layout === "collection") {
      return "grid w-full min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,268px),1fr))] gap-[clamp(1rem,2vw,1.5rem)]";
    }
    return "mt-6 grid w-full min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4";
  })();

  return (
    <>
      <div className={gridClassName}>
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            reviewSummary={summaries[product.id]}
            variant={cardVariant}
            listView={isList && (cardVariant === "collection" || cardVariant === "listing")}
            onNotify={() => setNotifyProduct(product)}
          />
        ))}
      </div>
      <OutOfStockModal
        open={notifyProduct !== null}
        onClose={() => setNotifyProduct(null)}
        productId={notifyProduct?.id ?? ""}
        productName={notifyProduct?.name ?? ""}
      />
    </>
  );
}
