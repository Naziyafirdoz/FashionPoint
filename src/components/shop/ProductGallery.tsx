"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/cn";
import { MediaPlaceholder } from "@/components/placeholders/MediaPlaceholder";

export function ProductGallery({ product }: { product: Product }) {
  const [active, setActive] = useState(0);
  const images = useMemo(() => product.images, [product.images]);

  const a = images[active] ?? images[0];

  return (
    <div className="rounded-[28px] border border-blush-100 bg-white/60 p-4 shadow-sm">
      <div className="relative overflow-hidden rounded-[22px] border border-blush-100 bg-white/70">
        <motion.div
          key={a?.src ?? `${active}`}
          initial={{ opacity: 0.6, scale: 1.01 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="relative p-3"
        >
          <MediaPlaceholder
            variant="hero"
            label="Gallery image placeholder"
            hint="Add multiple blouse images later"
            className="rounded-[18px]"
          />
          <div className="pointer-events-none absolute inset-0 opacity-0 hover:opacity-100 transition">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.25),transparent_40%)]" />
          </div>
        </motion.div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {images.slice(0, 6).map((img, idx) => (
          <button
            key={img.src}
            onClick={() => setActive(idx)}
            className={cn(
              "rounded-2xl overflow-hidden border bg-white/70 hover:bg-white transition p-2",
              idx === active ? "border-roseGold/60" : "border-blush-100"
            )}
            aria-label={`View image ${idx + 1}`}
          >
            <MediaPlaceholder
              variant="thumb"
              label="Thumb"
              hint="Coming soon"
              className="rounded-[14px]"
            />
          </button>
        ))}
      </div>
      <div className="mt-3 text-xs text-maroon/55">
        Hover to feel the “zoom” glow (demo). Real zoom can be plugged in later.
      </div>
    </div>
  );
}

