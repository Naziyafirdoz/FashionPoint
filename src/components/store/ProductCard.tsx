"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { ProductCardRating } from "@/components/reviews/ProductCardRating";
import { ProductImage } from "./ProductImage";
import type { ProductReviewSummary } from "@/lib/reviews/types";
import type { Product } from "@/types";

type Props = {
  product: Product;
  onNotify?: () => void;
  reviewSummary?: ProductReviewSummary | null;
};

function isProductOutOfStock(product: Product): boolean {
  if (product.variants && product.variants.length > 0) {
    return product.variants.every((v) => v.stock_quantity <= 0);
  }
  return product.stock_quantity !== undefined && product.stock_quantity <= 0;
}

export function ProductCard({ product, onNotify, reviewSummary }: Props) {
  const outOfStock = isProductOutOfStock(product);
  const discount =
    product.compare_price && product.compare_price > product.price
      ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100)
      : 0;

  return (
    <article className="card-store group relative flex flex-col">
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-blush">
        {product.images?.[0] && (
          <ProductImage
            src={product.images[0]}
            alt={product.name}
            className="object-cover transition group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, 25vw"
          />
        )}
        <button type="button" className="absolute right-2 top-2 rounded-full bg-white/90 p-2 shadow" aria-label="Wishlist">
          <Heart className="h-4 w-4 text-primary" />
        </button>
        {product.is_new && (
          <span className="absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white">
            NEW
          </span>
        )}
        {product.is_bestseller && (
          <span className="absolute left-2 top-8 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">
            BESTSELLER
          </span>
        )}
        {outOfStock && (
          <span className="absolute inset-x-2 bottom-2 rounded bg-foreground/70 py-1 text-center text-xs font-bold text-white">
            OUT OF STOCK
          </span>
        )}
      </div>
      <h3 className="mt-3 font-medium text-foreground line-clamp-2">{product.name}</h3>
      <div className="mt-1 flex items-center gap-2">
        <span className="font-bold text-primary">₹{product.price.toLocaleString("en-IN")}</span>
        {product.compare_price && (
          <span className="text-sm text-foreground/50 line-through">
            ₹{product.compare_price.toLocaleString("en-IN")}
          </span>
        )}
      </div>
      <ProductCardRating summary={reviewSummary} />
      {outOfStock ? (
        <button type="button" onClick={onNotify} className="btn-outline mt-3 w-full text-xs">
          Notify Me
        </button>
      ) : (
        <Link href={`/product/${product.slug}`} className="btn-outline mt-3 w-full text-center text-xs">
          EXPLORE NOW
        </Link>
      )}
    </article>
  );
}
