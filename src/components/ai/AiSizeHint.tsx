"use client";

import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import type { Product } from "@/lib/types";
import { Button } from "@/components/ui/Button";

type BodyType = "Petite" | "Regular" | "Curvy";

export function AiSizeHint({ product }: { product: Product }) {
  const [height, setHeight] = useState(160);
  const [weight, setWeight] = useState(55);
  const [body, setBody] = useState<BodyType>("Regular");
  const [size, setSize] = useState<number | null>(null);

  const suggestion = useMemo(() => {
    const base = height < 155 ? 34 : height < 165 ? 36 : height < 172 ? 38 : 40;
    const w = weight < 50 ? -2 : weight < 65 ? 0 : 2;
    const b = body === "Petite" ? -2 : body === "Curvy" ? 2 : 0;
    const rec = base + w + b;
    const nearest = product.sizes.reduce((prev, cur) =>
      Math.abs(cur - rec) < Math.abs(prev - rec) ? cur : prev
    , product.sizes[0] ?? 36);
    return nearest;
  }, [body, height, product.sizes, weight]);

  return (
    <div className="rounded-2xl border border-blush-100 bg-white/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-maroon flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-roseGold" />
          AI size recommendation
        </div>
        <Button size="sm" variant="outline" onClick={() => setSize(suggestion)}>
          Get size
        </Button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Field label="Height (cm)">
          <input
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
            className="h-9 w-full rounded-full border border-blush-100 bg-white/80 px-3 text-sm outline-none"
          />
        </Field>
        <Field label="Weight (kg)">
          <input
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            className="h-9 w-full rounded-full border border-blush-100 bg-white/80 px-3 text-sm outline-none"
          />
        </Field>
        <Field label="Body type">
          <select
            value={body}
            onChange={(e) => setBody(e.target.value as BodyType)}
            className="h-9 w-full rounded-full border border-blush-100 bg-white/80 px-3 text-sm outline-none"
          >
            <option>Petite</option>
            <option>Regular</option>
            <option>Curvy</option>
          </select>
        </Field>
      </div>

      <div className="mt-3 text-xs text-maroon/65">
        {size ? (
          <>
            Recommended size: <span className="font-semibold text-maroon">{size}</span>
          </>
        ) : (
          "Enter details and tap Get size."
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[11px] text-maroon/60 mb-1">{label}</div>
      {children}
    </label>
  );
}

