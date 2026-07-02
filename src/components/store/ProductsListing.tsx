"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import type { Product } from "@/types";
import { normalizeSizeFilter } from "@/config/size-chart";
import { getActiveFilterEntries } from "@/lib/product-filters";
import type { SizeMatchMode } from "@/lib/products/ai-size-shop-fallback";
import type { ProductFilterOptions } from "@/lib/products/extract-filter-options";
import { EMPTY_PRODUCT_FILTER_OPTIONS } from "@/lib/products/extract-filter-options";
import { ProductGrid } from "./ProductGrid";
import { FilterSidebar } from "./FilterSidebar";
import { ActiveFilters } from "./category/ActiveFilters";
import { ProductsAiSizeBanner } from "./products-listing/ProductsAiSizeBanner";
import { ProductsListingHeader } from "./products-listing/ProductsListingHeader";
import { ProductsListingSortBar } from "./products-listing/ProductsListingSortBar";
import { ProductsListingEmptyState } from "./products-listing/ProductsListingEmptyState";
import { ProductsListingAiPanel } from "./products-listing/ProductsListingAiPanel";
import { ProductsListingSkeleton } from "./products-listing/ProductsListingSkeleton";

export function ProductsListing() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState<ProductFilterOptions>(EMPTY_PRODUCT_FILTER_OPTIONS);
  const [loading, setLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [sizeMatchMode, setSizeMatchMode] = useState<SizeMatchMode | undefined>();

  const sizeFilter = searchParams.get("size");
  const normalizedSize = sizeFilter ? normalizeSizeFilter(sizeFilter) : null;

  const activeFilters = useMemo(
    () => getActiveFilterEntries(searchParams),
    [searchParams]
  );
  const activeFilterCount = activeFilters.length;

  const productCountLabel = useMemo(() => {
    if (loading) return "Loading products…";
    if (total === 0) return "Showing 0 of 0 products";
    return `Showing ${products.length} of ${total} products`;
  }, [loading, products.length, total]);

  const clearRecommendation = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("size");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setSizeMatchMode(undefined);
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
          setSizeMatchMode(
            data.sizeMatchMode === "compatible_oversize" || data.sizeMatchMode === "exact"
              ? data.sizeMatchMode
              : undefined
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, sizeFilter]);

  return (
    <>
      <ProductsListingHeader
        totalProducts={total}
        activeFilterCount={activeFilterCount}
        recommendedSize={normalizedSize}
      />

      <section className="w-full bg-[#FFF8F8] pt-5 pb-10 sm:pt-6 sm:pb-12">
        <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6">
          {sizeFilter && normalizedSize ? (
            <div className="mb-5">
              <ProductsAiSizeBanner
                recommendedSize={normalizedSize}
                sizeMatchMode={sizeMatchMode}
                onClearRecommendation={clearRecommendation}
              />
            </div>
          ) : null}

          <div className="w-full rounded-[24px] bg-white p-4 shadow-[0_4px_24px_rgba(122,13,43,0.05)] sm:p-5 lg:p-6">
            <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)_280px] lg:items-stretch">
              <div className="hidden h-full min-w-0 lg:block">
                <FilterSidebar
                  variant="listing"
                  filterOptions={facets}
                  panel
                  sticky
                />
              </div>

              <main className="min-w-0 w-full lg:self-start">
                <ProductsListingSortBar
                  productCountLabel={productCountLabel}
                  activeFilterCount={activeFilterCount}
                  onOpenMobileFilters={() => setMobileFiltersOpen(true)}
                />

                <ActiveFilters />

                {loading ? (
                  <ProductsListingSkeleton />
                ) : products.length === 0 ? (
                  <ProductsListingEmptyState />
                ) : (
                  <ProductGrid products={products} layout="listing" />
                )}
              </main>

              <div className="hidden h-full min-w-0 lg:block">
                <ProductsListingAiPanel />
              </div>
            </div>
          </div>

          <div className="mt-6 lg:hidden">
            <ProductsListingAiPanel />
          </div>
        </div>
      </section>

      {mobileFiltersOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close filters"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(100%,320px)] flex-col bg-[#FFF8F8] shadow-xl">
            <div className="flex items-center justify-between border-b border-[#F2E4E8] bg-white px-4 py-3">
              <span className="text-sm font-bold uppercase tracking-wide text-primary">Filters</span>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="rounded-full p-2 text-[#777777] hover:bg-[#FFF8F8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                aria-label="Close filters"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <FilterSidebar variant="listing" filterOptions={facets} panel />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
