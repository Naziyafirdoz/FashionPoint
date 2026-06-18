"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export function FiltersBar() {
  const [open, setOpen] = useState(false);
  const chips = useMemo(
    () => [
      "Color",
      "Size",
      "Fabric",
      "Price",
      "Occasion",
      "Rating 4+",
      "In Stock"
    ],
    []
  );

  return (
    <div className="rounded-[22px] border border-blush-100 bg-white/60 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-maroon">
          <SlidersHorizontal className="h-4 w-4" /> Filters
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-xs rounded-full border border-blush-100 bg-white/60 px-3 py-2 text-maroon/70 hover:bg-white/80 transition"
        >
          {open ? "Hide" : "Show"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {chips.map((c) => (
          <Badge key={c} className="cursor-pointer hover:opacity-90">
            {c}
          </Badge>
        ))}
      </div>

      {open ? (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-blush-100 bg-white/70 p-4">
            <div className="text-xs font-semibold text-maroon">Color</div>
            <div className="mt-2 text-xs text-maroon/65">
              Blush Pink · Cream · Maroon · Rose Gold · Light Gold
            </div>
          </div>
          <div className="rounded-2xl border border-blush-100 bg-white/70 p-4">
            <div className="text-xs font-semibold text-maroon">Size</div>
            <div className="mt-2 text-xs text-maroon/65">
              32 · 34 · 36 · 38 · 40 · 42
            </div>
          </div>
          <div className="rounded-2xl border border-blush-100 bg-white/70 p-4">
            <div className="text-xs font-semibold text-maroon">Occasion</div>
            <div className="mt-2 text-xs text-maroon/65">
              Daily · Office · Party · Wedding · Festive · Diwali · Bridal
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

