"use client";

import { Grid2x2, LayoutList } from "lucide-react";

type CategoryListingToolbarProps = {
  productCountLabel: string;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
};

const TOOLBAR_SELECT_CLASS =
  "rounded-full border border-black/[0.08] bg-white px-3 py-2 text-xs text-foreground/80 shadow-sm transition hover:border-primary/20 focus:border-primary/30 focus:outline-none sm:px-4 sm:text-sm";

export function CategoryListingToolbar({
  productCountLabel,
  viewMode,
  onViewModeChange
}: CategoryListingToolbarProps) {
  return (
    <div className="mb-5 space-y-3 border-b border-black/[0.06] pb-4">
      <div className="flex flex-wrap items-center gap-2">
        <select className={TOOLBAR_SELECT_CLASS} defaultValue="" aria-label="Filter by size">
          <option value="" disabled>
            Size
          </option>
          <option value="all">All Sizes</option>
        </select>
        <select className={TOOLBAR_SELECT_CLASS} defaultValue="" aria-label="Filter by color">
          <option value="" disabled>
            Color
          </option>
          <option value="all">All Colors</option>
        </select>
        <select className={TOOLBAR_SELECT_CLASS} defaultValue="" aria-label="Filter by fabric">
          <option value="" disabled>
            Fabric
          </option>
          <option value="all">All Fabrics</option>
        </select>
        <select className={TOOLBAR_SELECT_CLASS} defaultValue="" aria-label="Filter by neck type">
          <option value="" disabled>
            Neck Type
          </option>
          <option value="all">All Neck Types</option>
        </select>
        <select className={TOOLBAR_SELECT_CLASS} defaultValue="" aria-label="Filter by sleeve type">
          <option value="" disabled>
            Sleeve Type
          </option>
          <option value="all">All Sleeve Types</option>
        </select>
        <select className={TOOLBAR_SELECT_CLASS} defaultValue="" aria-label="Filter by price">
          <option value="" disabled>
            Price
          </option>
          <option value="all">All Prices</option>
        </select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-medium text-foreground/70">{productCountLabel}</span>
        <div className="flex items-center gap-2">
          <select
            className={TOOLBAR_SELECT_CLASS}
            defaultValue="latest"
            aria-label="Sort products"
          >
            <option value="latest">Sort by: Latest</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
          <div className="flex rounded-full border border-black/[0.08] bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => onViewModeChange("grid")}
              className={`rounded-full p-2 transition ${
                viewMode === "grid" ? "bg-primary text-white" : "text-foreground/60 hover:text-primary"
              }`}
              aria-label="Grid view"
              aria-pressed={viewMode === "grid"}
            >
              <Grid2x2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("list")}
              className={`rounded-full p-2 transition ${
                viewMode === "list" ? "bg-primary text-white" : "text-foreground/60 hover:text-primary"
              }`}
              aria-label="List view"
              aria-pressed={viewMode === "list"}
            >
              <LayoutList className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
