"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { normalizeSizeFilter } from "@/config/size-chart";
import { colorMatchesFilter } from "@/lib/product-filters";
import {
  canRenderColorSwatch,
  EMPTY_PRODUCT_FILTER_OPTIONS,
  extractProductFilterOptions,
  type FacetGroup,
  type FilterOption,
  type ProductFilterOptions,
} from "@/lib/products/extract-filter-options";
import type { Product } from "@/types";

const VISIBLE_LIMIT = 5;

const LISTING_CHECKBOX =
  "h-4 w-4 shrink-0 rounded border border-[#DCCFD4] bg-white text-white accent-[#7B0D2B] transition duration-200 ease-out hover:border-[#7B0D2B] focus:ring-2 focus:ring-[#7B0D2B]/15 focus:ring-offset-0 checked:border-[#7B0D2B] checked:bg-[#7B0D2B]";

const LISTING_VIEW_MORE =
  "text-xs font-semibold text-[#7B0D2B] transition-all duration-200 ease-out hover:text-[#B8860B] hover:underline";

const LISTING_PANEL_CLASS =
  "w-full min-w-0 max-w-full space-y-0 rounded-[20px] border border-[#F2E4E8] bg-white p-6 shadow-[0_10px_35px_rgba(122,13,43,0.06)]";

const STICKY_LISTING_PANEL_CLASS =
  "lg:sticky lg:top-[clamp(4.5rem,8vh,6rem)] lg:z-0 lg:max-h-[calc(100vh-clamp(4.5rem,8vh,6rem)-0.75rem)] lg:overflow-y-auto lg:overscroll-y-contain";

type FilterSidebarProps = {
  products?: Product[];
  filterOptions?: ProductFilterOptions;
  panel?: boolean;
  sticky?: boolean;
  variant?: "default" | "listing";
};

function isSizeSelected(selected: string, value: string): boolean {
  if (!selected) return false;
  if (selected === value) return true;
  return normalizeSizeFilter(selected).toLowerCase() === normalizeSizeFilter(value).toLowerCase();
}

function isColorSelected(selected: string, value: string): boolean {
  if (!selected) return false;
  return colorMatchesFilter(value, selected);
}

function isValueSelected(selected: string, value: string): boolean {
  if (!selected) return false;
  return selected.toLowerCase() === value.toLowerCase();
}

export function FilterSidebar({
  products = [],
  filterOptions: filterOptionsProp,
  panel = false,
  sticky = false,
  variant = "default"
}: FilterSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isListing = variant === "listing";

  const filterOptions = useMemo(
    () => filterOptionsProp ?? extractProductFilterOptions(products),
    [filterOptionsProp, products]
  );

  const selected = useMemo(() => {
    const values: Record<string, string> = {};
    for (const [key, value] of searchParams.entries()) {
      if (key === "page" || key === "sort" || key === "category" || key === "sub_category") {
        continue;
      }
      values[key] = value;
    }
    if (values.size) values.size = normalizeSizeFilter(values.size);
    return values;
  }, [searchParams]);

  const priceSliderMax = filterOptions.priceMax ?? 0;
  const priceSliderValue = selected.priceMax
    ? Number(selected.priceMax)
    : priceSliderMax;

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      if (key !== "page" && key !== "sort") {
        params.delete("page");
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const toggleParam = useCallback(
    (key: string, value: string, type: FacetGroup["type"]) => {
      const current = searchParams.get(key);
      const isActive =
        type === "size"
          ? current
            ? isSizeSelected(current, value)
            : false
          : type === "color"
            ? current
              ? isColorSelected(current, value)
              : false
            : current?.toLowerCase() === value.toLowerCase();

      updateParam(key, isActive ? "" : value);
    },
    [searchParams, updateParam]
  );

  const hasAnyFilters =
    filterOptions.groups.length > 0 ||
    (filterOptions.priceMin !== null &&
      filterOptions.priceMax !== null &&
      filterOptions.priceMax > filterOptions.priceMin);

  const renderFacetGroup = (group: FacetGroup) => {
    const selectedValue = selected[group.key] ?? "";

    if (group.type === "color") {
      return (
        <CollapsibleFilterGroup key={group.key} title={group.label} listing={isListing}>
          <ColorFilterList
            colors={group.options}
            selected={selectedValue}
            onToggle={(value) => toggleParam(group.key, value, group.type)}
            listing={isListing}
            isSelected={isColorSelected}
          />
        </CollapsibleFilterGroup>
      );
    }

    return (
      <CollapsibleFilterGroup key={group.key} title={group.label} listing={isListing}>
        <CheckboxFilterList
          items={group.options}
          selected={selectedValue}
          onToggle={(value) => toggleParam(group.key, value, group.type)}
          listing={isListing}
          isSelected={group.type === "size" ? isSizeSelected : isValueSelected}
        />
      </CollapsibleFilterGroup>
    );
  };

  const asideClassName = (() => {
    if (isListing && panel) {
      return sticky ? "" : LISTING_PANEL_CLASS;
    }
    if (panel) {
      return `w-full min-w-0 max-w-full space-y-1 rounded-[18px] border border-black/[0.06] bg-white/95 p-[clamp(1rem,2vw,1.25rem)] shadow-[0_8px_28px_rgba(123,13,43,0.06)] ${
        sticky
          ? "lg:sticky lg:top-[clamp(4.5rem,8vh,6rem)] lg:max-h-[calc(100vh-clamp(5rem,10vh,7rem))] lg:overflow-y-auto"
          : ""
      }`;
    }
    return `hidden w-full min-w-0 space-y-6 lg:block ${sticky ? "lg:sticky lg:top-[clamp(4.5rem,8vh,6rem)]" : ""}`;
  })();

  const filterBody = (
    <>
      {isListing ? (
        <div className="mb-2 flex items-center gap-2.5 border-b border-[#F3E7EA] pb-5">
          <SlidersHorizontal className="h-5 w-5 text-[#7B0D2B]" aria-hidden="true" />
          <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-[#7B0D2B]">Filters</h2>
        </div>
      ) : (
        <h2 className="mb-4 font-display text-lg font-bold text-primary">Filters</h2>
      )}

      {!hasAnyFilters ? (
        <p className={`text-sm ${isListing ? "text-[#666666]" : "text-foreground/60"}`}>
          No filters available for the current products.
        </p>
      ) : null}

      {filterOptions.groups.map(renderFacetGroup)}

      {filterOptions.priceMin !== null &&
      filterOptions.priceMax !== null &&
      filterOptions.priceMax > filterOptions.priceMin ? (
        <CollapsibleFilterGroup title="Price" defaultOpen listing={isListing}>
          <PriceFilterRange
            min={filterOptions.priceMin}
            max={filterOptions.priceMax}
            value={Number.isFinite(priceSliderValue) ? priceSliderValue : filterOptions.priceMax}
            listing={isListing}
            onChange={(value) => updateParam("priceMax", String(value))}
          />
        </CollapsibleFilterGroup>
      ) : null}
    </>
  );

  if (isListing && panel && sticky) {
    return (
      <aside className="flex h-full w-full min-w-0 flex-col">
        <div className={`${LISTING_PANEL_CLASS} ${STICKY_LISTING_PANEL_CLASS}`}>{filterBody}</div>
      </aside>
    );
  }

  return (
    <aside className={asideClassName}>{filterBody}</aside>
  );
}

function CollapsibleFilterGroup({
  title,
  children,
  defaultOpen = true,
  listing = false
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  listing?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={`border-b last:border-b-0 ${
        listing ? "border-[#F3E7EA] py-7 first:pt-2" : "border-black/[0.06] py-6"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`group flex w-full items-center justify-between text-left transition-colors duration-200 ease-out ${
          listing ? "-mx-1 rounded-lg px-1 py-1 hover:bg-[#FFF5F7]" : ""
        }`}
        aria-expanded={open}
      >
        <span
          className={
            listing
              ? "text-[13px] font-semibold uppercase tracking-[0.08em] text-[#7B0D2B]"
              : "text-sm font-bold uppercase text-primary"
          }
        >
          {title}
        </span>
        {open ? (
          <ChevronUp
            className={`h-4 w-4 transition-transform duration-200 ease-out ${
              listing ? "text-[#7B0D2B] group-hover:scale-110" : "text-[#777777]"
            }`}
            aria-hidden="true"
          />
        ) : (
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ease-out ${
              listing ? "text-[#7B0D2B] group-hover:rotate-180" : "text-[#777777]"
            }`}
            aria-hidden="true"
          />
        )}
      </button>
      {open ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

function CheckboxFilterList({
  items,
  selected,
  onToggle,
  listing = false,
  isSelected
}: {
  items: FilterOption[];
  selected: string;
  onToggle: (value: string) => void;
  listing?: boolean;
  isSelected: (selected: string, value: string) => boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const visibleItems = expanded ? items : items.slice(0, VISIBLE_LIMIT);
  const hasMore = items.length > VISIBLE_LIMIT;

  return (
    <div className={listing ? "space-y-3.5" : "space-y-3"}>
      {visibleItems.map((item) => {
        const checked = isSelected(selected, item.value);
        return (
          <label
            key={item.value}
            className={`flex cursor-pointer items-center gap-3 leading-relaxed transition-colors duration-200 ease-out ${
              listing
                ? `rounded-lg px-1 py-0.5 hover:bg-[#FFF5F7] ${
                    checked ? "text-[#7B0D2B]" : "text-[#333333] hover:text-[#7B0D2B]"
                  }`
                : "text-sm text-foreground/80"
            }`}
          >
            <input
              type="checkbox"
              className={listing ? LISTING_CHECKBOX : "rounded border-primary/40 text-primary focus:ring-primary/30"}
              checked={checked}
              onChange={() => onToggle(item.value)}
            />
            <span className={listing ? "text-sm" : ""}>
              {item.label}
              {item.count > 0 ? ` (${item.count})` : ""}
            </span>
          </label>
        );
      })}
      {hasMore ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className={listing ? LISTING_VIEW_MORE : "text-xs font-semibold text-[#7B0D2B] transition hover:text-[#7B0D2B]/80 hover:underline"}
        >
          {expanded ? "View Less" : "+ View More"}
        </button>
      ) : null}
    </div>
  );
}

function ColorFilterList({
  colors,
  selected,
  onToggle,
  listing = false,
  isSelected
}: {
  colors: FilterOption[];
  selected: string;
  onToggle: (value: string) => void;
  listing?: boolean;
  isSelected: (selected: string, value: string) => boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const visibleColors = expanded ? colors : colors.slice(0, VISIBLE_LIMIT);
  const hasMore = colors.length > VISIBLE_LIMIT;

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {visibleColors.map((color) => {
          const checked = isSelected(selected, color.value);
          const showSwatch = canRenderColorSwatch(color.value);

          if (showSwatch) {
            return (
              <button
                key={color.value}
                type="button"
                title={`${color.label}${color.count > 0 ? ` (${color.count})` : ""}`}
                onClick={() => onToggle(color.value)}
                className={
                  listing
                    ? `h-[22px] w-[22px] rounded-full transition-all duration-200 ease-out hover:scale-[1.08] hover:shadow-[0_2px_8px_rgba(122,13,43,0.14)] ${
                        checked
                          ? "border-2 border-[#7B0D2B] shadow-[0_0_0_3px_rgba(123,13,43,0.12)]"
                          : "border-2 border-white shadow-[0_0_0_1px_#DCCFD4]"
                      }`
                    : `h-[24px] w-[24px] rounded-full border-2 shadow-[0_1px_2px_rgba(0,0,0,0.06)] transition ${
                        checked
                          ? "border-[#7B0D2B] ring-2 ring-[#7B0D2B]/25"
                          : "border-white ring-1 ring-[#F2E4E8]"
                      }`
                }
                style={{ background: color.value.trim().toLowerCase() }}
              />
            );
          }

          return (
            <button
              key={color.value}
              type="button"
              onClick={() => onToggle(color.value)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition duration-200 ease-out ${
                listing
                  ? checked
                    ? "border-[#7B0D2B] bg-[#FCECEF] text-[#7B0D2B]"
                    : "border-[#F2E4E8] bg-white text-[#333333] hover:border-[#7B0D2B]/40 hover:bg-[#FFF5F7]"
                  : checked
                    ? "border-primary bg-secondary/20 text-primary"
                    : "border-black/10 bg-white text-foreground/80 hover:border-primary/30"
              }`}
            >
              {color.label}
              {color.count > 0 ? ` (${color.count})` : ""}
            </button>
          );
        })}
      </div>
      {hasMore ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className={
            listing
              ? `mt-3.5 ${LISTING_VIEW_MORE}`
              : "mt-3 text-xs font-semibold text-[#7B0D2B] transition hover:text-[#7B0D2B]/80 hover:underline"
          }
        >
          {expanded ? "View Less" : "+ View More"}
        </button>
      ) : null}
    </div>
  );
}

function PriceFilterRange({
  min,
  max,
  value,
  listing,
  onChange
}: {
  min: number;
  max: number;
  value: number;
  listing: boolean;
  onChange: (value: number) => void;
}) {
  const step = max - min > 1000 ? 100 : max - min > 100 ? 50 : 10;
  const clampedValue = Math.min(max, Math.max(min, value));

  return (
    <>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={clampedValue}
        className="mt-1 w-full accent-[#7B0D2B]"
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <p className={`mt-2 text-sm ${listing ? "text-[#666666]" : "text-foreground/60"}`}>
        ₹{min.toLocaleString("en-IN")} — ₹{clampedValue.toLocaleString("en-IN")}
      </p>
    </>
  );
}