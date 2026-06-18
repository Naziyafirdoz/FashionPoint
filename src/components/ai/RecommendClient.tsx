"use client";

import { useMemo, useState } from "react";
import type { Product, ProductOccasion } from "@/lib/types";
import { ProductGrid } from "@/components/shop/ProductGrid";
import { Badge } from "@/components/ui/Badge";

const OCC: ProductOccasion[] = [
  "Daily",
  "Office",
  "Party",
  "Wedding",
  "Festive",
  "Diwali",
  "Bridal"
];

const COLORS = [
  "Blue",
  "Red",
  "Green",
  "Black",
  "White",
  "Gold",
  "Pink",
  "Maroon",
  "Cream"
];

export function RecommendClient({ products }: { products: Product[] }) {
  const [occasion, setOccasion] = useState<ProductOccasion>("Wedding");
  const [sareeColor, setSareeColor] = useState("Blue");
  const [pref, setPref] = useState("Rose Gold");

  const recommended = useMemo(() => {
    const score = (p: Product) => {
      let s = 0;
      if (p.occasion.includes(occasion)) s += 4;
      if (p.colors.some((c) => c.toLowerCase().includes(pref.toLowerCase())))
        s += 2;

      const match: Record<string, string[]> = {
        Blue: ["Cream", "Light Gold", "Blush Pink", "Rose Gold"],
        Red: ["Maroon", "Rose Gold", "Cream"],
        Green: ["Cream", "Light Gold", "Maroon"],
        Black: ["Rose Gold", "Light Gold", "Blush Pink"],
        White: ["Maroon", "Rose Gold", "Blush Pink"],
        Gold: ["Maroon", "Cream", "Blush Pink"],
        Pink: ["Maroon", "Cream", "Light Gold"],
        Maroon: ["Cream", "Light Gold", "Blush Pink"],
        Cream: ["Maroon", "Rose Gold", "Blush Pink"]
      };
      const picks = match[sareeColor] ?? [];
      if (p.colors.some((c) => picks.some((x) => c.includes(x)))) s += 3;
      s += Math.min(1.5, p.rating / 5);
      return s;
    };
    return [...products].sort((a, b) => score(b) - score(a)).slice(0, 6);
  }, [occasion, pref, products, sareeColor]);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="rounded-[28px] border border-blush-100 bg-white/60 p-6 shadow-sm">
        <div className="text-sm font-semibold text-maroon">
          Your preferences (demo)
        </div>

        <div className="mt-4 grid gap-3">
          <Field label="Occasion">
            <select
              className="h-11 w-full rounded-full border border-blush-100 bg-white/80 px-4 text-sm outline-none"
              value={occasion}
              onChange={(e) => setOccasion(e.target.value as ProductOccasion)}
            >
              {OCC.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Saree color to match">
            <select
              className="h-11 w-full rounded-full border border-blush-100 bg-white/80 px-4 text-sm outline-none"
              value={sareeColor}
              onChange={(e) => setSareeColor(e.target.value)}
            >
              {COLORS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Color preference">
            <input
              className="h-11 w-full rounded-full border border-blush-100 bg-white/80 px-4 text-sm outline-none"
              value={pref}
              onChange={(e) => setPref(e.target.value)}
              placeholder="Rose Gold"
            />
          </Field>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Badge>Recommended for your {sareeColor.toLowerCase()} saree</Badge>
          <Badge variant="gold">{occasion} edit</Badge>
        </div>
      </div>

      <div className="lg:col-span-2">
        <ProductGrid products={recommended} />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs text-maroon/60 mb-1">{label}</div>
      {children}
    </label>
  );
}

