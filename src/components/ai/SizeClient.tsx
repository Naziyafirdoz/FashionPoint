"use client";

import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

type BodyType = "Petite" | "Regular" | "Curvy";

export function SizeClient() {
  const [height, setHeight] = useState(160);
  const [weight, setWeight] = useState(55);
  const [body, setBody] = useState<BodyType>("Regular");
  const [fit, setFit] = useState<"Snug" | "Regular" | "Relaxed">("Regular");

  const rec = useMemo(() => {
    const base = height < 155 ? 34 : height < 165 ? 36 : height < 172 ? 38 : 40;
    const w = weight < 50 ? -2 : weight < 65 ? 0 : 2;
    const b = body === "Petite" ? -2 : body === "Curvy" ? 2 : 0;
    const f = fit === "Snug" ? -2 : fit === "Relaxed" ? 2 : 0;
    return base + w + b + f;
  }, [body, fit, height, weight]);

  const note = useMemo(() => {
    if (fit === "Snug") return "Snug fit: choose a closer size, best for structured sarees.";
    if (fit === "Relaxed") return "Relaxed fit: comfortable for long wear and heavy drapes.";
    return "Regular fit: balanced comfort and silhouette.";
  }, [fit]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-[28px] border border-blush-100 bg-white/60 p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-maroon flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-roseGold" />
            Inputs
          </div>
          <Badge>AI demo</Badge>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Field label="Height (cm)">
            <input
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              className="h-11 w-full rounded-full border border-blush-100 bg-white/80 px-4 text-sm outline-none"
            />
          </Field>
          <Field label="Weight (kg)">
            <input
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              className="h-11 w-full rounded-full border border-blush-100 bg-white/80 px-4 text-sm outline-none"
            />
          </Field>
          <Field label="Body type">
            <select
              value={body}
              onChange={(e) => setBody(e.target.value as BodyType)}
              className="h-11 w-full rounded-full border border-blush-100 bg-white/80 px-4 text-sm outline-none"
            >
              <option>Petite</option>
              <option>Regular</option>
              <option>Curvy</option>
            </select>
          </Field>
          <Field label="Fit preference">
            <select
              value={fit}
              onChange={(e) => setFit(e.target.value as "Snug" | "Regular" | "Relaxed")}
              className="h-11 w-full rounded-full border border-blush-100 bg-white/80 px-4 text-sm outline-none"
            >
              <option>Snug</option>
              <option>Regular</option>
              <option>Relaxed</option>
            </select>
          </Field>
        </div>

        <div className="mt-4 text-xs text-maroon/65">{note}</div>
      </div>

      <div className="rounded-[28px] border border-blush-100 bg-white/60 p-6 shadow-sm">
        <div className="font-[family-name:var(--font-display)] text-2xl text-maroon">
          Result
        </div>
        <div className="mt-3 text-sm text-maroon/70">
          Recommended size:{" "}
          <span className="font-semibold text-maroon">{rec}</span>
        </div>
        <div className="mt-6 rounded-2xl border border-blush-100 bg-white/70 p-4">
          <div className="text-sm font-semibold text-maroon">Next step</div>
          <div className="mt-1 text-sm text-maroon/70">
            Open a product page and select the closest available size.
          </div>
          <div className="mt-4">
            <Button href="/products">Browse Products</Button>
          </div>
        </div>
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

