"use client";

import { Star } from "lucide-react";
import type { Product, Review } from "@/lib/types";

export function Reviews({
  product,
  reviews
}: {
  product: Product;
  reviews: Review[];
}) {
  return (
    <section className="rounded-[28px] border border-blush-100 bg-white/60 p-6 shadow-sm">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="font-[family-name:var(--font-display)] text-2xl text-maroon">
            Reviews & ratings
          </div>
          <div className="mt-1 text-sm text-maroon/70">
            {product.rating.toFixed(1)} average · {product.reviewCount} total
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-maroon">
          <Star className="h-4 w-4 text-lightGold" />
          {product.rating.toFixed(1)}
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        {reviews.length ? (
          reviews.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-blush-100 bg-white/70 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-maroon">{r.name}</div>
                <div className="text-xs text-maroon/60">{r.createdAt}</div>
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs text-maroon/70">
                <Star className="h-4 w-4 text-lightGold" />
                {r.rating.toFixed(1)}
              </div>
              <p className="mt-2 text-sm text-maroon/75">{r.comment}</p>
            </div>
          ))
        ) : (
          <div className="text-sm text-maroon/70">
            No reviews yet. Be the first to review this blouse.
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-blush-100 bg-white/70 p-4">
        <div className="text-sm font-semibold text-maroon">
          Customer uploaded photos (demo)
        </div>
        <div className="mt-3 grid grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-xl bg-gradient-to-tr from-blush-100/60 via-white/60 to-lightGold/40 border border-blush-100"
              aria-hidden
            />
          ))}
        </div>
      </div>
    </section>
  );
}

