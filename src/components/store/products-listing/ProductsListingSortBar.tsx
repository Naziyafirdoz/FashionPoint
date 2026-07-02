"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import {
  getProductSortLabel,
  parseProductSort,
  PRODUCT_SORT_OPTIONS
} from "@/lib/products/catalog-sort";

type ProductsListingSortBarProps = {
  productCountLabel: string;
  activeFilterCount: number;
  onOpenMobileFilters?: () => void;
};

const PILL_CLASS =
  "inline-flex h-10 shrink-0 items-center justify-between gap-2 rounded-[18px] border border-[#F2E4E8] bg-white px-4 text-sm font-medium text-[#2A2A2A] transition duration-200 hover:border-[#7B0D2B] hover:bg-[#FFF5F7] sm:px-[18px]";

export function ProductsListingSortBar({
  productCountLabel,
  activeFilterCount,
  onOpenMobileFilters
}: ProductsListingSortBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  const activeSort = parseProductSort(searchParams.get("sort"));
  const sortLabel = getProductSortLabel(activeSort);

  useEffect(() => {
    if (!sortOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!sortRef.current?.contains(event.target as Node)) {
        setSortOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [sortOpen]);

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "latest") {
      params.delete("sort");
    } else {
      params.set("sort", value);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
    setSortOpen(false);
  };

  return (
    <div className="mb-4 w-full min-w-0">
      <div className="flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          {onOpenMobileFilters ? (
            <button
              type="button"
              onClick={onOpenMobileFilters}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-[18px] border border-[#F2E4E8] bg-white px-4 text-sm font-semibold text-[#7B0D2B] transition duration-200 hover:border-[#7B0D2B] hover:bg-[#FFF5F7] lg:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              Filters
            </button>
          ) : null}
          <p className="text-sm font-medium leading-none text-[#555555]">{productCountLabel}</p>
          {activeFilterCount > 0 ? (
            <span className="rounded-full bg-[#FFF0F3] px-2.5 py-1 text-xs font-medium text-primary">
              {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"} active
            </span>
          ) : null}
        </div>

        <div className="relative shrink-0" ref={sortRef}>
          <button
            type="button"
            className={PILL_CLASS}
            aria-label="Sort products"
            aria-expanded={sortOpen}
            aria-haspopup="listbox"
            onClick={() => setSortOpen((open) => !open)}
          >
            <span className="whitespace-nowrap">Sort by: {sortLabel}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-[#666666]" aria-hidden="true" />
          </button>
          {sortOpen ? (
            <ul
              role="listbox"
              aria-label="Sort options"
              className="absolute right-0 z-20 mt-2 min-w-[220px] overflow-hidden rounded-[14px] border border-[#F2E4E8] bg-white py-1 shadow-[0_12px_32px_rgba(122,13,43,0.12)]"
            >
              {PRODUCT_SORT_OPTIONS.map((option) => (
                <li key={option.value} role="option" aria-selected={activeSort === option.value}>
                  <button
                    type="button"
                    className={`flex w-full items-center px-4 py-2.5 text-left text-sm transition hover:bg-[#FFF5F7] ${
                      activeSort === option.value
                        ? "font-semibold text-[#7B0D2B]"
                        : "text-[#2A2A2A]"
                    }`}
                    onClick={() => handleSortChange(option.value)}
                  >
                    {option.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
