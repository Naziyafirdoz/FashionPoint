"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { normalizeSizeFilter, SIZE_CHART_CONFIG } from "@/config/size-chart";

const SIZES = SIZE_CHART_CONFIG.sizes.map((s) => s.label);
const COLORS = ["Pink", "Red", "Purple", "Green", "Blue", "Black", "Maroon", "Gold"];
const FABRICS = ["Cotton", "Silk", "Satin", "Linen", "Georgette", "Rayon"];
const NECK_TYPES = ["Round", "Boat", "V-Neck", "Square", "Princess", "Deep"];
const SLEEVE_TYPES = ["Sleeveless", "Short", "Half Sleeve", "Full Sleeve", "Cap Sleeve"];

const VISIBLE_LIMIT = 5;

type FilterSidebarProps = {
  panel?: boolean;
  sticky?: boolean;
};

export function FilterSidebar({ panel = false, sticky = false }: FilterSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selected = useMemo(
    () => ({
      size: searchParams.get("size") ? normalizeSizeFilter(searchParams.get("size")!) : "",
      color: searchParams.get("color") ?? "",
      fabric: searchParams.get("fabric") ?? "",
      neck: searchParams.get("neck") ?? "",
      sleeve: searchParams.get("sleeve") ?? "",
      priceMax: searchParams.get("priceMax") ?? "5000"
    }),
    [searchParams]
  );

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const toggleParam = useCallback(
    (key: string, value: string) => {
      const current = searchParams.get(key);
      updateParam(key, current === value ? "" : value);
    },
    [searchParams, updateParam]
  );

  return (
    <aside
      className={
        panel
          ? `hidden space-y-1 rounded-[18px] border border-black/[0.06] bg-white/95 p-5 shadow-[0_8px_28px_rgba(123,13,43,0.06)] lg:block ${
              sticky ? "lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto" : ""
            }`
          : `hidden space-y-6 lg:block ${sticky ? "lg:sticky lg:top-24 lg:self-start" : ""}`
      }
    >
      <h2 className="mb-4 font-display text-lg font-bold text-primary">Filters</h2>

      <CollapsibleFilterGroup title="Size">
        <CheckboxFilterList
          items={SIZES}
          selected={selected.size}
          onToggle={(value) => toggleParam("size", value)}
        />
      </CollapsibleFilterGroup>

      <CollapsibleFilterGroup title="Color">
        <div className="flex flex-wrap gap-2">
          {COLORS.map((color) => (
            <button
              key={color}
              type="button"
              title={color}
              onClick={() => toggleParam("color", color)}
              className={`h-7 w-7 rounded-full border-2 shadow-sm transition ${
                selected.color === color
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-white ring-1 ring-black/[0.08]"
              }`}
              style={{ background: color.toLowerCase() === "gold" ? "#d4af37" : color.toLowerCase() }}
            />
          ))}
        </div>
      </CollapsibleFilterGroup>

      <CollapsibleFilterGroup title="Fabric">
        <CheckboxFilterList
          items={FABRICS}
          selected={selected.fabric}
          onToggle={(value) => toggleParam("fabric", value)}
        />
      </CollapsibleFilterGroup>

      <CollapsibleFilterGroup title="Neck Type">
        <CheckboxFilterList
          items={NECK_TYPES}
          selected={selected.neck}
          onToggle={(value) => toggleParam("neck", value)}
        />
      </CollapsibleFilterGroup>

      <CollapsibleFilterGroup title="Sleeve Type">
        <CheckboxFilterList
          items={SLEEVE_TYPES}
          selected={selected.sleeve}
          onToggle={(value) => toggleParam("sleeve", value)}
        />
      </CollapsibleFilterGroup>

      <CollapsibleFilterGroup title="Price" defaultOpen>
        <input
          type="range"
          min={0}
          max={5000}
          step={100}
          value={selected.priceMax}
          className="mt-1 w-full accent-primary"
          onChange={(e) => updateParam("priceMax", e.target.value)}
        />
        <p className="mt-2 text-sm text-foreground/60">₹0 — ₹{selected.priceMax}</p>
      </CollapsibleFilterGroup>
    </aside>
  );
}

function CollapsibleFilterGroup({
  title,
  children,
  defaultOpen = true
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-black/[0.06] py-4 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-primary">{title}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-foreground/50" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-4 w-4 text-foreground/50" aria-hidden="true" />
        )}
      </button>
      {open ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

function CheckboxFilterList({
  items,
  selected,
  onToggle
}: {
  items: string[];
  selected: string;
  onToggle: (value: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const visibleItems = expanded ? items : items.slice(0, VISIBLE_LIMIT);
  const hasMore = items.length > VISIBLE_LIMIT;

  return (
    <div className="space-y-2">
      {visibleItems.map((item) => (
        <label key={item} className="flex cursor-pointer items-center gap-2.5 text-sm text-foreground/80">
          <input
            type="checkbox"
            className="rounded border-primary/40 text-primary focus:ring-primary/30"
            checked={selected === item}
            onChange={() => onToggle(item)}
          />
          {item}
        </label>
      ))}
      {hasMore ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="text-xs font-semibold text-primary transition hover:text-primary/80"
        >
          {expanded ? "View Less" : "View More"}
        </button>
      ) : null}
    </div>
  );
}
