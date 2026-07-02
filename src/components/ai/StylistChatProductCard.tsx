"use client";

import Image from "next/image";
import Link from "next/link";
import type { StylistProductResult } from "@/lib/stylist-assistant/types";
import { formatInr, getDiscountPercent } from "@/lib/style-recommender-ui";

type StylistChatProductCardProps = {
  result: StylistProductResult;
};

export function StylistChatProductCard({ result }: StylistChatProductCardProps) {
  const { product, matchPercent, matchReasons, inStock } = result;
  const discount = getDiscountPercent(product);
  const image = product.images?.[0];
  const topReason = matchReasons[0];

  return (
    <article className="overflow-hidden rounded-xl border border-[#F2E4E8] bg-white">
      <div className="flex gap-2 p-2">
        <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-[#FFFBFC]">
          {image ? (
            <Image src={image} alt={product.name} fill className="object-cover" sizes="56px" />
          ) : (
            <div className="flex h-full items-center justify-center text-[9px] text-foreground/45">
              No image
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[11px] font-semibold leading-snug text-primary">
            {product.name}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px]">
            <span className="font-semibold text-foreground">{formatInr(product.price)}</span>
            {product.compare_price != null && product.compare_price > product.price ? (
              <span className="text-foreground/45 line-through">
                {formatInr(product.compare_price)}
              </span>
            ) : null}
            {discount != null ? <span className="text-secondary">{discount}% off</span> : null}
          </div>
          <p className="mt-0.5 text-[10px] text-foreground/55">
            {inStock ? "In Stock" : "Out of Stock"} · {matchPercent}% match
          </p>
          {topReason ? (
            <p className="mt-0.5 line-clamp-1 text-[10px] text-foreground/60">{topReason}</p>
          ) : null}
          {product.rating != null && product.review_count != null && product.review_count > 0 ? (
            <p className="mt-0.5 text-[10px] text-foreground/55">
              {product.rating}/5 · {product.review_count} review
              {product.review_count === 1 ? "" : "s"}
            </p>
          ) : null}
          <Link
            href={`/product/${product.slug}`}
            className="mt-1 inline-flex text-[10px] font-semibold text-primary underline-offset-2 hover:underline"
          >
            View Product
          </Link>
        </div>
      </div>
    </article>
  );
}
