"use client";

import { useMemo, useState } from "react";
import { Palette, Sparkles } from "lucide-react";
import type { Product } from "@/lib/types";

const COMMON = [
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

export function AiSareeMatchHint({ product }: { product: Product }) {
  const [sareeColor, setSareeColor] = useState("Blue");

  const msg = useMemo(() => {
    const map: Record<string, string[]> = {
      Blue: ["Cream", "Light Gold", "Blush Pink"],
      Red: ["Maroon", "Rose Gold", "Cream"],
      Green: ["Cream", "Light Gold", "Maroon"],
      Black: ["Rose Gold", "Light Gold", "Blush Pink"],
      White: ["Maroon", "Rose Gold", "Blush Pink"],
      Gold: ["Maroon", "Cream", "Blush Pink"],
      Pink: ["Maroon", "Cream", "Light Gold"],
      Maroon: ["Cream", "Light Gold", "Blush Pink"],
      Cream: ["Maroon", "Rose Gold", "Blush Pink"]
    };
    const picks = map[sareeColor] ?? ["Cream", "Maroon"];
    const overlaps = picks.filter((c) =>
      product.colors.some((pc) => pc.toLowerCase().includes(c.toLowerCase()))
    );
    if (overlaps.length) {
      return `Recommended for your ${sareeColor.toLowerCase()} saree: ${overlaps.join(", ")} tones in this blouse.`;
    }
    return `Recommended for your ${sareeColor.toLowerCase()} saree: consider ${picks.join(", ")} blouse tones.`;
  }, [product.colors, sareeColor]);

  return (
    <div className="rounded-2xl border border-blush-100 bg-white/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-maroon flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-roseGold" />
          AI saree match
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-blush-100 bg-white/80 px-3 h-9 text-sm text-maroon">
          <Palette className="h-4 w-4 text-roseGold" />
          <select
            aria-label="Saree color"
            value={sareeColor}
            onChange={(e) => setSareeColor(e.target.value)}
            className="bg-transparent outline-none"
          >
            {COMMON.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-3 text-xs text-maroon/65">{msg}</div>
    </div>
  );
}

