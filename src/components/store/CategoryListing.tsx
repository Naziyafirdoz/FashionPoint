"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Product, SubCategory } from "@/types";
import { ProductGrid } from "./ProductGrid";
import { FilterSidebar } from "./FilterSidebar";
import { AiFeaturesPanel } from "./AiFeaturesPanel";
import { ExploreCollectionsSectionBackground } from "./ExploreCollectionsSectionBackground";
import { CategoryListingToolbar } from "./category-listing/CategoryListingToolbar";
import { CategoryListingPagination } from "./category-listing/CategoryListingPagination";
import { CategoryListingPreFooter } from "./category-listing/CategoryListingPreFooter";

type Props = {
  categorySlug?: string;
  subCategories?: SubCategory[];
};

function buildCategoryHref(
  categorySlug: string,
  searchParams: URLSearchParams,
  subCategorySlug?: string | null
): string {
  const params = new URLSearchParams(searchParams.toString());
  if (subCategorySlug) {
    params.set("sub_category", subCategorySlug);
  } else {
    params.delete("sub_category");
  }
  const qs = params.toString();
  return `/category/${categorySlug}${qs ? `?${qs}` : ""}`;
}

export function CategoryListing({
  categorySlug,
  subCategories = []
}: Props) {
  const searchParams = useSearchParams();
  const activeSubCategory = searchParams.get("sub_category");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const chipBase =
    "rounded-full border px-3 py-1 text-xs font-medium transition sm:text-sm";
  const chipActive = "border-primary bg-primary text-white";
  const chipInactive = "border-accent/30 bg-white text-foreground/70 hover:border-primary/40 hover:text-primary";

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      const params = new URLSearchParams(searchParams.toString());
      if (categorySlug) params.set("category", categorySlug);

      const qs = params.toString();
      try {
        const res = await fetch(`/api/products${qs ? `?${qs}` : ""}`);
        const data = await res.json();
        if (!cancelled) setProducts(data.products ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [categorySlug, searchParams]);

  const filteredProducts = useMemo(() => {
    const sleeve = searchParams.get("sleeve");
    if (!sleeve) return products;

    return products.filter((product) =>
      product.sleeve_type?.toLowerCase().includes(sleeve.toLowerCase())
    );
  }, [products, searchParams]);

  const visible = filteredProducts.slice(0, 12);

  const productCountLabel = loading
    ? "Loading products…"
    : `Showing 1 to ${Math.min(12, filteredProducts.length)} of ${filteredProducts.length} products`;

  return (
    <>
      {subCategories.length > 0 && categorySlug && (
        <section className="border-b border-accent/15 bg-white py-4">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-2 px-4 sm:px-6">
            <Link
              href={buildCategoryHref(categorySlug, searchParams)}
              className={`${chipBase} ${!activeSubCategory ? chipActive : chipInactive}`}
            >
              All
            </Link>
            {subCategories.map((sub) => (
              <Link
                key={sub.id}
                href={buildCategoryHref(categorySlug, searchParams, sub.slug)}
                className={`${chipBase} ${
                  activeSubCategory === sub.slug ? chipActive : chipInactive
                }`}
              >
                {sub.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="relative w-full overflow-hidden">
        <ExploreCollectionsSectionBackground subtle />
        <div className="relative z-10 mx-auto grid max-w-[1440px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[270px_minmax(0,1fr)_250px] lg:gap-6 lg:py-8 xl:gap-8">
          <FilterSidebar panel sticky />

          <div className="min-w-0">
            <CategoryListingToolbar
              productCountLabel={productCountLabel}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />

            {loading ? (
              <p className="text-sm text-foreground/60">Loading…</p>
            ) : visible.length === 0 ? (
              <p className="text-sm text-foreground/60">No products match your filters.</p>
            ) : (
              <ProductGrid products={visible} layout="boutique" viewMode={viewMode} />
            )}

            {!loading && filteredProducts.length > 0 ? (
              <CategoryListingPagination
                totalProducts={filteredProducts.length}
                visibleCount={Math.min(12, filteredProducts.length)}
              />
            ) : null}
          </div>

          <AiFeaturesPanel premium />
        </div>
      </section>

      <CategoryListingPreFooter />
    </>
  );
}
