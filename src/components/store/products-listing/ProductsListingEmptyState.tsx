"use client";

import Link from "next/link";
import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PackageOpen } from "lucide-react";
import { getActiveFilterEntries } from "@/lib/product-filters";

export function ProductsListingEmptyState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeFilters = getActiveFilterEntries(searchParams);
  const hasActiveFilters = activeFilters.length > 0;

  const clearFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    for (const { key } of activeFilters) {
      params.delete(key);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [activeFilters, pathname, router, searchParams]);

  return (
    <div className="flex w-full flex-col items-center justify-center rounded-[18px] border border-dashed border-[#F2E4E8] bg-[#FFFCFC] px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FFF0F3] text-primary">
        <PackageOpen className="h-7 w-7" aria-hidden="true" />
      </div>
      <p className="mt-4 font-display text-lg font-bold text-[#7B0D2B]">No products match your filters.</p>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-[#666666]">
        Try adjusting or clearing your filters to discover more styles.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex h-10 items-center justify-center rounded-full border border-primary/30 bg-white px-5 text-sm font-semibold text-primary transition hover:bg-[#FFF5F7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Clear Filters
          </button>
        ) : null}
        <Link
          href="/products"
          className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-white transition hover:bg-[#8f1230] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Browse All Products
        </Link>
      </div>
    </div>
  );
}
