"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, Heart, Star } from "lucide-react";
import type { Product } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { getLowestStock, isOutOfStock } from "@/lib/products";
import { useWishlistStore } from "@/stores/wishlist";
import { MediaPlaceholder } from "@/components/placeholders/MediaPlaceholder";

export function ProductCard({ product }: { product: Product }) {
  const out = isOutOfStock(product);
  const low = getLowestStock(product);
  const wished = useWishlistStore((s) => s.has(product.id));
  const toggle = useWishlistStore((s) => s.toggle);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className={cn(
        "group rounded-[26px] border border-blush-100 bg-white/65 overflow-hidden shadow-sm hover:shadow-soft transition",
        out && "opacity-90"
      )}
    >
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-tr from-blush-100/30 via-transparent to-lightGold/25" />
        <div className="relative p-3">
          <MediaPlaceholder
            variant="product"
            label="Product image coming soon"
            hint="Replace with your blouse photos later"
            className="rounded-[22px] border-blush-100"
          />
        </div>

        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {out ? (
            <Badge variant="danger">Out of stock</Badge>
          ) : low > 0 && low <= 2 ? (
            <Badge variant="gold">Only {low} left</Badge>
          ) : product.tags.includes("New Arrival") ? (
            <Badge>New</Badge>
          ) : null}
        </div>

        <div className="absolute right-3 top-3 flex flex-col gap-2">
          <button
            aria-label="Add to wishlist"
            onClick={() => toggle(product.id)}
            className={cn(
              "h-10 w-10 rounded-full grid place-items-center border border-blush-100 bg-white/75 hover:bg-white transition shadow-sm text-maroon",
              wished && "bg-blush-100"
            )}
          >
            <Heart className={cn("h-5 w-5", wished && "fill-maroon")} />
          </button>
          <Link
            aria-label="Quick view"
            href={`/products/${product.slug}?quick=1`}
            className="h-10 w-10 rounded-full grid place-items-center border border-blush-100 bg-white/75 hover:bg-white transition shadow-sm text-maroon"
          >
            <Eye className="h-5 w-5" />
          </Link>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-maroon leading-snug">
              {product.name}
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs text-maroon/70">
              <Star className="h-4 w-4 text-lightGold" />
              {product.rating.toFixed(1)} · {product.reviewCount} reviews
            </div>
          </div>
          <div className="text-sm font-semibold text-maroon">
            ₹{product.priceInr.toLocaleString("en-IN")}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <Button
            href={`/products/${product.slug}`}
            className="flex-1"
            disabled={out}
          >
            Explore Now
          </Button>
          <Button href={`/products/${product.slug}`} variant="ghost" disabled={out}>
            <span className="hidden sm:inline">Quick</span>
            <span className="sm:hidden">View</span>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

