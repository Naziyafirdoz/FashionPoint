"use client";

import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import type { Product } from "@/types";
import { formatInr } from "@/lib/style-recommender-ui";

type StyleQuickViewModalProps = {
  product: Product | null;
  onClose: () => void;
};

export function StyleQuickViewModal({ product, onClose }: StyleQuickViewModalProps) {
  if (!product) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="style-quick-view-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-[16px] border border-[#F2E4E8] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#F2E4E8] px-4 py-3">
          <h3 id="style-quick-view-title" className="text-sm font-bold text-primary">
            Quick View
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-foreground/60 transition hover:bg-[#FFF5F7] hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-label="Close quick view"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative aspect-square bg-[#FFFBFC]">
          {product.images?.[0] ? (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 400px"
            />
          ) : null}
        </div>

        <div className="space-y-2 p-4">
          <p className="font-display text-base font-bold text-primary">{product.name}</p>
          <p className="text-sm font-semibold text-foreground">{formatInr(product.price)}</p>
          {product.short_description ? (
            <p className="text-xs leading-relaxed text-foreground/65">{product.short_description}</p>
          ) : null}
          <Link
            href={`/product/${product.slug}`}
            className="btn-primary mt-2 inline-flex h-10 w-full items-center justify-center rounded-full text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            View Product
          </Link>
        </div>
      </div>
    </div>
  );
}
