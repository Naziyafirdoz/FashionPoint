"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import type { CategoryPageData, SubCategory } from "@/types";
import { getCategoryUrl } from "@/lib/categories/category-url";
import {
  EMPTY_PRODUCT_FILTER_OPTIONS,
  type ProductFilterOptions
} from "@/lib/products/extract-filter-options";
import { getActiveFilterEntries } from "@/lib/product-filters";
import { ProductGrid } from "@/components/store/ProductGrid";
import { FilterSidebar } from "@/components/store/FilterSidebar";
import { AiFeaturesPanel } from "@/components/store/AiFeaturesPanel";
import { CategoryListingToolbar } from "@/components/store/category-listing/CategoryListingToolbar";
import { CategoryListingPagination } from "@/components/store/category-listing/CategoryListingPagination";
import { CategoryListingPreFooter } from "@/components/store/category-listing/CategoryListingPreFooter";
import { ActiveFilters } from "@/components/store/category/ActiveFilters";
import { CategoryEmptyState } from "@/components/store/category/CategoryEmptyState";

type Props = {
  category: CategoryPageData;
  subCategories?: SubCategory[];
};

function buildCategoryHref(
  categorySlug: string,
  searchParams: URLSearchParams,
  subCategorySlug?: string | null
): string {
  const params = new URLSearchParams(searchParams.toString());
  params.delete("page");

  if (subCategorySlug) {
    params.set("sub_category", subCategorySlug);
  } else {
    params.delete("sub_category");
  }

  const qs = params.toString();
  return `${getCategoryUrl(categorySlug)}${qs ? `?${qs}` : ""}`;
}

function ProductListingSkeleton() {
  return (
    <div className="grid w-full min-w-0 grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="h-[420px] animate-pulse rounded-[18px] border border-[#F2E4E8] bg-[#FFF5F7]"
        />
      ))}
    </div>
  );
}

export function CategoryListing({ category, subCategories = [] }: Props) {
  const searchParams = useSearchParams();
  const activeSubCategorySlug = searchParams.get("sub_category");

  const [products, setProducts] = useState<import("@/types").Product[]>([]);
  const [facets, setFacets] = useState<ProductFilterOptions>(EMPTY_PRODUCT_FILTER_OPTIONS);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const chipBase =
    "rounded-full border px-3 py-1 text-xs font-medium transition sm:text-sm";
  const chipActive = "border-primary bg-primary text-white";
  const chipInactive =
    "border-[#F2E4E8] bg-white text-[#777777] hover:border-primary/40 hover:text-primary";

  const hasActiveFilters = useMemo(
    () => getActiveFilterEntries(searchParams).length > 0,
    [searchParams]
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams(searchParams.toString());
      params.set("category", category.slug);

      const result = await fetchProducts(params.toString());

      if (!cancelled) {
        if (result.error) {
          setProducts([]);
          setFacets(result.facets);
          setTotal(0);
          setPage(1);
          setError(result.error);
          return;
        }

        setProducts(result.products);
        setFacets(result.facets);
        setTotal(result.total);
        setPage(result.page);
        setPageSize(result.pageSize);
      }
    })().finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [category.slug, searchParams]);

  const totalPages = useMemo(
    () => (pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1),
    [pageSize, total]
  );

  const productCountLabel = useMemo(() => {
    if (loading) return "Loading products…";
    if (error) return "Products unavailable";
    if (total === 0) return "Showing 0 products";

    const from = (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);
    return `Showing ${from} to ${to} of ${total} products`;
  }, [error, loading, page, pageSize, total]);

  return (
    <>
      {subCategories.length > 0 ? (
        <section className="border-b border-[#F2E4E8] bg-white py-4">
          <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center gap-2 px-6">
            <Link
              href={buildCategoryHref(category.slug, searchParams)}
              className={`${chipBase} ${!activeSubCategorySlug ? chipActive : chipInactive}`}
            >
              All
            </Link>
            {subCategories.map((sub) => (
              <Link
                key={sub.id}
                href={buildCategoryHref(category.slug, searchParams, sub.slug)}
                className={`${chipBase} ${
                  activeSubCategorySlug === sub.slug ? chipActive : chipInactive
                }`}
              >
                {sub.name}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section
        id="category-listing"
        className="w-full bg-[#FFF8F8] pt-5 pb-0 sm:pt-6 sm:pb-0"
      >
        <div className="mx-auto w-full max-w-[1600px] px-6">
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
                <CategoryListingToolbar
                  productCountLabel={productCountLabel}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  onOpenMobileFilters={() => setMobileFiltersOpen(true)}
                />

                <ActiveFilters />

                {loading ? (
                  <ProductListingSkeleton />
                ) : error ? (
                  <p className="w-full text-sm font-medium text-[#7B0D2B]">{error}</p>
                ) : products.length === 0 ? (
                  <CategoryEmptyState hasActiveFilters={hasActiveFilters} />
                ) : (
                  <>
                    <ProductGrid products={products} layout="listing" viewMode={viewMode} />
                    <CategoryListingPagination page={page} totalPages={totalPages} />
                  </>
                )}
              </main>

              <div className="hidden h-full min-w-0 lg:block">
                <AiFeaturesPanel premium />
              </div>
            </div>
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
                className="rounded-full p-2 text-[#777777] hover:bg-[#FFF8F8]"
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

      <CategoryListingPreFooter />
    </>
  );
}

async function fetchProducts(queryString: string): Promise<{
  products: import("@/types").Product[];
  facets: ProductFilterOptions;
  total: number;
  page: number;
  pageSize: number;
  error?: string;
}> {
  try {
    const res = await fetch(`/api/products${queryString ? `?${queryString}` : ""}`, {
      cache: "no-store"
    });
    const data = await res.json();

    if (!res.ok) {
      return {
        products: [],
        facets: data.facets ?? EMPTY_PRODUCT_FILTER_OPTIONS,
        total: 0,
        page: 1,
        pageSize: 12,
        error: data.error ?? "Unable to load products. Please try again."
      };
    }

    return {
      products: data.products ?? [],
      facets: data.facets ?? EMPTY_PRODUCT_FILTER_OPTIONS,
      total: Number(data.total) || 0,
      page: Number(data.page) || 1,
      pageSize: Number(data.pageSize) || 12
    };
  } catch {
    return {
      products: [],
      facets: EMPTY_PRODUCT_FILTER_OPTIONS,
      total: 0,
      page: 1,
      pageSize: 12,
      error: "Network error. Please check your connection and try again."
    };
  }
}
