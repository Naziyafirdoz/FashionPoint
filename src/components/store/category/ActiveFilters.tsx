"use client";

import { useCallback, useMemo } from "react";
import { X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  getActiveFilterDisplayLabel,
  getActiveFilterEntries
} from "@/lib/product-filters";

export function ActiveFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeFilters = useMemo(
    () => getActiveFilterEntries(searchParams),
    [searchParams]
  );

  const clearFilter = useCallback(
    (key: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete(key);
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const clearAll = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    for (const { key } of activeFilters) {
      params.delete(key);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [activeFilters, pathname, router, searchParams]);

  if (activeFilters.length === 0) return null;

  return (
    <div className="mb-4 flex w-full flex-wrap items-center gap-2">
      {activeFilters.map(({ key, value }) => (
        <button
          key={`${key}-${value}`}
          type="button"
          onClick={() => clearFilter(key)}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#F2E4E8] bg-white px-3 py-1.5 text-xs font-medium text-[#555555] transition hover:border-primary/40 hover:text-primary"
        >
          {getActiveFilterDisplayLabel(key, value)}
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only">Remove filter</span>
        </button>
      ))}
      {activeFilters.length > 1 ? (
        <button
          type="button"
          onClick={clearAll}
          className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
        >
          Clear all
        </button>
      ) : null}
    </div>
  );
}
