"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Grid2x2, LayoutList } from "lucide-react";
import {
  getProductSortLabel,
  PRODUCT_SORT_OPTIONS,
  type ProductSortValue
} from "@/lib/products/catalog-sort";

type WishlistToolbarProps = {
  itemCount: number;
  sort: ProductSortValue;
  onSortChange: (sort: ProductSortValue) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  sticky?: boolean;
};

const PILL_CLASS =
  "inline-flex h-10 shrink-0 items-center justify-between gap-2 rounded-[18px] border border-[#F2E4E8] bg-white px-4 text-sm font-medium text-[#2A2A2A] transition duration-200 hover:border-primary hover:bg-[#FFF5F7] sm:px-[18px]";

function ViewToggleButton({
  active,
  onClick,
  label,
  children
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border transition duration-200 ${
        active
          ? "border-primary bg-primary text-white"
          : "border-[#F2E4E8] bg-white text-[#666666] hover:border-primary/40 hover:bg-[#FFF5F7] hover:text-primary"
      }`}
      aria-label={label}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

export function WishlistToolbar({
  itemCount,
  sort,
  onSortChange,
  viewMode,
  onViewModeChange,
  sticky = false
}: WishlistToolbarProps) {
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const sortLabel = getProductSortLabel(sort);

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

  return (
    <div
      className={
        sticky
          ? "sticky top-[57px] z-30 -mx-4 mb-5 border-b border-[#F3E5E8]/80 bg-[#FFFBF9]/95 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6"
          : "mb-5"
      }
    >
      <div className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <h2 className="font-display text-lg font-bold text-[#2A2A2A] sm:text-xl">
          {itemCount.toLocaleString("en-IN")} Item{itemCount === 1 ? "" : "s"} in your wishlist
        </h2>

        <div className="flex shrink-0 items-center gap-2">
          <div className="relative" ref={sortRef}>
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
                  <li key={option.value} role="option" aria-selected={sort === option.value}>
                    <button
                      type="button"
                      className={`flex w-full items-center px-4 py-2.5 text-left text-sm transition hover:bg-[#FFF5F7] ${
                        sort === option.value
                          ? "font-semibold text-primary"
                          : "text-[#2A2A2A]"
                      }`}
                      onClick={() => {
                        onSortChange(option.value);
                        setSortOpen(false);
                      }}
                    >
                      {option.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5">
            <ViewToggleButton
              active={viewMode === "grid"}
              onClick={() => onViewModeChange("grid")}
              label="Grid view"
            >
              <Grid2x2 className="h-[18px] w-[18px]" />
            </ViewToggleButton>
            <ViewToggleButton
              active={viewMode === "list"}
              onClick={() => onViewModeChange("list")}
              label="List view"
            >
              <LayoutList className="h-[18px] w-[18px]" />
            </ViewToggleButton>
          </div>
        </div>
      </div>
    </div>
  );
}
