"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Sparkles, Upload } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PRODUCTS } from "@/lib/products";

export function TryOnClient() {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [productSlug, setProductSlug] = useState(PRODUCTS[0]?.slug ?? "");

  const product = useMemo(
    () => PRODUCTS.find((p) => p.slug === productSlug) ?? PRODUCTS[0],
    [productSlug]
  );

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="rounded-[28px] border border-blush-100 bg-white/60 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-maroon flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-roseGold" />
            Upload your photo
          </div>
          <Badge>AI demo</Badge>
        </div>

        <div className="mt-4 rounded-2xl border border-blush-100 bg-white/70 p-4">
          {photoUrl ? (
            <div className="relative overflow-hidden rounded-2xl border border-blush-100">
              <Image
                src={photoUrl}
                alt="Your photo"
                width={1200}
                height={1400}
                className="aspect-[3/4] w-full object-cover"
              />
            </div>
          ) : (
            <div className="grid place-items-center rounded-2xl border border-dashed border-blush-200 bg-white/60 p-10 text-sm text-maroon/60">
              Upload a front-facing photo (local preview only)
            </div>
          )}

          <label className="mt-4 inline-flex items-center gap-2 rounded-full px-4 h-11 border border-blush-100 bg-white/80 hover:bg-white transition text-sm text-maroon cursor-pointer">
            <Upload className="h-4 w-4" />
            Upload photo
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setPhotoUrl(URL.createObjectURL(f));
              }}
            />
          </label>
        </div>

        <div className="mt-4">
          <div className="text-xs text-maroon/60 mb-1">Pick a blouse</div>
          <select
            value={productSlug}
            onChange={(e) => setProductSlug(e.target.value)}
            className="h-11 w-full rounded-full border border-blush-100 bg-white/80 px-4 text-sm outline-none"
          >
            {PRODUCTS.map((p) => (
              <option key={p.id} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5 text-xs text-maroon/60">
          Real AI try‑on needs segmentation + garment warp models; this starter
          renders a tasteful overlay preview.
        </div>

        <div className="mt-5">
          <Button href={`/products/${productSlug}`}>Open product</Button>
        </div>
      </div>

      <div className="lg:col-span-2 rounded-[28px] border border-blush-100 bg-white/60 p-6 shadow-sm">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="font-[family-name:var(--font-display)] text-2xl text-maroon">
              Preview
            </div>
            <div className="text-sm text-maroon/70">
              Overlay preview for: {product?.name}
            </div>
          </div>
          <Badge variant="gold">Virtual try‑on (demo)</Badge>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-blush-100 bg-white/70 p-4">
            <div className="text-sm font-semibold text-maroon">Your photo</div>
            <div className="mt-3 relative overflow-hidden rounded-2xl border border-blush-100 bg-white">
              {photoUrl ? (
                <Image
                  src={photoUrl}
                  alt="Your photo"
                  width={1200}
                  height={1400}
                  className="aspect-[3/4] w-full object-cover"
                />
              ) : (
                <div className="aspect-[3/4] w-full grid place-items-center text-sm text-maroon/60 bg-gradient-to-tr from-blush-100/60 via-white/70 to-lightGold/40">
                  Upload to preview
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-blush-100 bg-white/70 p-4">
            <div className="text-sm font-semibold text-maroon">Overlay</div>
            <div className="mt-3 relative overflow-hidden rounded-2xl border border-blush-100 bg-white">
              {photoUrl ? (
                <>
                  <Image
                    src={photoUrl}
                    alt="Try-on"
                    width={1200}
                    height={1400}
                    className="aspect-[3/4] w-full object-cover"
                  />
                  <div className="absolute inset-x-0 top-[32%] mx-auto w-[78%] h-[26%] rounded-[28px] bg-maroon/15 border border-roseGold/40 backdrop-blur-[1px]" />
                  <div className="absolute inset-x-0 top-[32%] mx-auto w-[78%] h-[26%] bg-[radial-gradient(circle_at_30%_30%,rgba(231,215,160,0.35),transparent_55%)]" />
                </>
              ) : (
                <div className="aspect-[3/4] w-full grid place-items-center text-sm text-maroon/60 bg-gradient-to-tr from-blush-100/60 via-white/70 to-lightGold/40">
                  Upload to preview
                </div>
              )}
            </div>
            <div className="mt-3 text-xs text-maroon/60">
              Overlay color is intentionally subtle and premium.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

