"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { normalizeSizeFilter, SIZE_CHART_CONFIG } from "@/config/size-chart";

const SIZES = SIZE_CHART_CONFIG.sizes.map((s) => s.label);
const COLORS = ["Pink", "Red", "Purple", "Green", "Blue", "Black"];
const FABRICS = ["Cotton", "Silk", "Satin", "Linen", "Georgette", "Rayon"];
const NECK_TYPES = ["Round", "Boat", "V-Neck", "Square", "Princess", "Deep"];

export function FilterSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selected = useMemo(
    () => ({
      size: searchParams.get("size") ? normalizeSizeFilter(searchParams.get("size")!) : "",
      color: searchParams.get("color") ?? "",
      fabric: searchParams.get("fabric") ?? "",
      neck: searchParams.get("neck") ?? "",
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
    <aside className="hidden space-y-6 lg:block">
      <FilterGroup title="SIZE">
        {SIZES.map((s) => (
          <label key={s} className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="rounded border-primary"
              checked={selected.size === s}
              onChange={() => toggleParam("size", s)}
            />
            {s}
          </label>
        ))}
      </FilterGroup>

      <FilterGroup title="COLOR">
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              title={c}
              onClick={() => toggleParam("color", c)}
              className={`h-6 w-6 rounded-full border-2 shadow ring-1 ring-foreground/20 ${
                selected.color === c ? "border-primary ring-2 ring-primary" : "border-white"
              }`}
              style={{ background: c.toLowerCase() }}
            />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="FABRIC">
        {FABRICS.map((f) => (
          <label key={f} className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.fabric === f}
              onChange={() => toggleParam("fabric", f)}
            />
            {f}
          </label>
        ))}
      </FilterGroup>

      <FilterGroup title="NECK TYPE">
        {NECK_TYPES.map((n) => (
          <label key={n} className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.neck === n}
              onChange={() => toggleParam("neck", n)}
            />
            {n}
          </label>
        ))}
      </FilterGroup>

      <div>
        <p className="text-xs font-bold text-primary">PRICE</p>
        <input
          type="range"
          min={0}
          max={5000}
          step={100}
          value={selected.priceMax}
          className="mt-2 w-full"
          onChange={(e) => updateParam("priceMax", e.target.value)}
        />
        <p className="text-xs text-foreground/60">₹0 — ₹{selected.priceMax}</p>
      </div>
    </aside>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold text-primary">{title}</p>
      <div className="mt-2 space-y-1">{children}</div>
    </div>
  );
}
