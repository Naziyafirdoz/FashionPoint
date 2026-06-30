"use client";

import { motion } from "framer-motion";
import { ProductGrid } from "@/components/store/ProductGrid";
import { WISHLIST_CONTAINER_CLASS } from "@/components/wishlist/constants";
import { WishlistSectionDivider } from "@/components/wishlist/WishlistSectionDivider";
import type { Product } from "@/types";

type WishlistRecommendedProps = {
  products: Product[];
};

export function WishlistRecommended({ products }: WishlistRecommendedProps) {
  if (products.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut", delay: 0.1 }}
      className={`${WISHLIST_CONTAINER_CLASS} pt-12`}
      aria-labelledby="wishlist-recommended-heading"
    >
      <header className="mb-6 text-center">
        <h2
          id="wishlist-recommended-heading"
          className="font-display text-2xl font-bold text-[#7B0D2B] sm:text-[1.75rem]"
        >
          You may also like
        </h2>
        <WishlistSectionDivider />
      </header>
      <div className="mx-auto w-full max-w-[1280px]">
        <ProductGrid products={products} layout="recommendation" />
      </div>
    </motion.section>
  );
}
