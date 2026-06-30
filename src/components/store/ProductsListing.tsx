"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Product } from "@/types";
import { normalizeSizeFilter } from "@/config/size-chart";
import { displayColorName } from "@/lib/product-filters";
import type { ProductFilterOptions } from "@/lib/products/extract-filter-options";
import { EMPTY_PRODUCT_FILTER_OPTIONS } from "@/lib/products/extract-filter-options";
import { ProductGrid } from "./ProductGrid";
import { FilterSidebar } from "./FilterSidebar";
import { AiFeaturesPanel } from "./AiFeaturesPanel";

export function ProductsListing() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState<ProductFilterOptions>(EMPTY_PRODUCT_FILTER_OPTIONS);
  const [loading, setLoading] = useState(true);
  const sizeFilter = searchParams.get("size");
  const colorFilter = searchParams.get("color");
  const normalizedSize = sizeFilter ? normalizeSizeFilter(sizeFilter) : null;
  const normalizedColor = colorFilter ? displayColorName(colorFilter) : null;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      const params = new URLSearchParams(searchParams.toString());
      params.set("limit", "24");
      if (sizeFilter) {
        params.set("size", normalizeSizeFilter(sizeFilter));
      }

      const qs = params.toString();
      try {
        const res = await fetch(`/api/products${qs ? `?${qs}` : ""}`, { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) {
          setProducts(data.products ?? []);
          setTotal(Number(data.total) || data.products?.length || 0);
          if (data.facets) setFacets(data.facets);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, sizeFilter]);

  const visible = products;

  return (
    <>
      <section className="bg-gradient-to-r from-blush to-white py-12">
        <div className="mx-auto max-w-7xl px-4">
          <h1 className="font-display text-3xl font-bold text-primary md:text-4xl">
            Shop All Products
          </h1>
          <p className="mt-2 text-foreground/70">
            {normalizedSize
              ? `Showing blouses available in size ${normalizedSize}.`
              : normalizedColor
                ? `Showing blouses in ${normalizedColor}.`
                : "Browse our full collection of premium readymade blouses."}
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[240px_1fr_220px]">
        <FilterSidebar filterOptions={facets} />
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-foreground/60">
              {loading
                ? "Loading products…"
                : `Showing ${visible.length} of ${total} products`}
            </span>
            {normalizedSize ? (
              <span className="rounded-full bg-secondary/20 px-3 py-1 text-xs font-medium text-primary">
                Size: {normalizedSize}
              </span>
            ) : null}
            {normalizedColor ? (
              <span className="rounded-full bg-secondary/20 px-3 py-1 text-xs font-medium text-primary">
                Color: {normalizedColor}
              </span>
            ) : null}
          </div>
          {loading ? (
            <p className="text-sm text-foreground/60">Loading…</p>
          ) : visible.length === 0 ? (
            <p className="text-sm text-foreground/60">
              No products found for this filter. Try another size or{" "}
              <a href="/products" className="text-primary underline">
                view all products
              </a>
              .
            </p>
          ) : (
            <ProductGrid products={visible} />
          )}
        </div>
        <AiFeaturesPanel />
      </div>
    </>
  );
}
