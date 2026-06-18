"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/types";
import { ProductGrid } from "./ProductGrid";
import { buildProductsQueryString } from "@/lib/product-filters";

export function TrendingProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/products${buildProductsQueryString({})}`);
        const data = await res.json();
        if (!cancelled) setProducts(data.products ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="mt-6 text-sm text-foreground/60">Loading products…</p>;
  }

  if (!products.length) {
    return <p className="mt-6 text-sm text-foreground/60">No products available.</p>;
  }

  return <ProductGrid products={products} />;
}
