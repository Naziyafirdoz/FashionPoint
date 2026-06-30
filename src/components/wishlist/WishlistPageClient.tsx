"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  WISHLIST_CONTAINER_CLASS,
  WISHLIST_GRID_CLASS,
  WISHLIST_LIST_CLASS
} from "@/components/wishlist/constants";
import { WishlistEmptyState } from "@/components/wishlist/WishlistEmptyState";
import { WishlistExploreCta } from "@/components/wishlist/WishlistExploreCta";
import { WishlistHero } from "@/components/wishlist/WishlistHero";
import { WishlistProductItem } from "@/components/wishlist/WishlistProductItem";
import { WishlistRecommended } from "@/components/wishlist/WishlistRecommended";
import { WishlistSummaryCards } from "@/components/wishlist/WishlistSummaryCards";
import { WishlistToolbar } from "@/components/wishlist/WishlistToolbar";
import { useProductReviewSummaries } from "@/hooks/useProductReviewSummaries";
import type { ProductSortValue } from "@/lib/products/catalog-sort";
import {
  isProductInStock,
  isProductReadyForPurchase
} from "@/lib/wishlist/product-stock";
import { sortWishlistEntries, type WishlistEntry } from "@/lib/wishlist/sort-wishlist-items";
import { devLog } from "@/lib/dev-log";
import { useWishlistStore } from "@/stores/wishlist";
import type { Product } from "@/types";

export type WishlistInitialItem = {
  wishlistId: string;
  productId: string;
  createdAt: string;
  slug: string;
};

type WishlistPageClientProps = {
  initialItems: WishlistInitialItem[];
  recommendedProducts: Product[];
};

const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

async function fetchProductBySlug(slug: string): Promise<Product | null> {
  try {
    const response = await fetch(`/api/products/${encodeURIComponent(slug)}`);
    if (!response.ok) return null;
    const data = (await response.json()) as { product?: Product };
    return data.product ?? null;
  } catch {
    return null;
  }
}

export function WishlistPageClient({
  initialItems,
  recommendedProducts
}: WishlistPageClientProps) {
  const [entries, setEntries] = useState<WishlistEntry[]>([]);
  const [loading, setLoading] = useState(initialItems.length > 0);
  const [sort, setSort] = useState<ProductSortValue>("latest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (initialItems.length === 0) {
        setEntries([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const hydrated = await Promise.all(
        initialItems.map(async (item) => {
          const product = await fetchProductBySlug(item.slug);
          if (!product) return null;
          return {
            wishlistId: item.wishlistId,
            productId: item.productId,
            createdAt: item.createdAt,
            product
          } satisfies WishlistEntry;
        })
      );

      if (cancelled) return;

      const nextEntries = hydrated.filter((entry): entry is WishlistEntry => entry !== null);
      devLog("[wishlist] client hydrated products", {
        requested: initialItems.length,
        loaded: nextEntries.length,
        productIds: nextEntries.map((entry) => entry.product.id)
      });
      setEntries(nextEntries);
      setLoading(false);

      useWishlistStore
        .getState()
        .setIds(nextEntries.map((entry) => entry.product.id));
    })();

    return () => {
      cancelled = true;
    };
  }, [initialItems]);

  const sortedEntries = useMemo(
    () => sortWishlistEntries(entries, sort),
    [entries, sort]
  );

  const productIds = useMemo(
    () => sortedEntries.map((entry) => entry.product.id),
    [sortedEntries]
  );
  const { summaries } = useProductReviewSummaries(productIds);

  const savedCount = entries.length;

  const recentlyAddedCount = useMemo(() => {
    if (entries.length === 0) return 0;
    const cutoff = Date.now() - RECENT_WINDOW_MS;
    return entries.filter((entry) => new Date(entry.createdAt).getTime() >= cutoff).length;
  }, [entries]);

  const stockMetrics = useMemo(() => {
    if (loading || entries.length === 0) {
      return {
        availableCount: null as number | null,
        readyCount: null as number | null,
        totalValue: null as number | null
      };
    }

    return {
      availableCount: entries.filter((entry) => isProductInStock(entry.product)).length,
      readyCount: entries.filter((entry) => isProductReadyForPurchase(entry.product)).length,
      totalValue: entries.reduce((sum, entry) => sum + entry.product.price, 0)
    };
  }, [entries, loading]);

  const handleRemoved = (wishlistId: string) => {
    setEntries((current) => current.filter((entry) => entry.wishlistId !== wishlistId));
  };

  const gridClassName = viewMode === "list" ? WISHLIST_LIST_CLASS : WISHLIST_GRID_CLASS;

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="bg-[#FFFBF9] pb-12"
    >
      <WishlistHero savedCount={savedCount} />

      {savedCount > 0 ? (
        <WishlistSummaryCards
          savedCount={savedCount}
          recentlyAddedCount={loading ? null : recentlyAddedCount}
          availableCount={stockMetrics.availableCount}
          readyCount={stockMetrics.readyCount}
          totalValue={stockMetrics.totalValue}
        />
      ) : null}

      {savedCount === 0 && !loading ? (
        <div className={WISHLIST_CONTAINER_CLASS}>
          <WishlistEmptyState />
        </div>
      ) : (
        <section
          className={`${WISHLIST_CONTAINER_CLASS} pt-10`}
          aria-labelledby="wishlist-products-heading"
        >
          <h2 id="wishlist-products-heading" className="sr-only">
            Wishlist products
          </h2>

          <WishlistToolbar
            sticky={savedCount > 0}
            itemCount={savedCount}
            sort={sort}
            onSortChange={setSort}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />

          {loading ? (
            <div className={gridClassName}>
              {initialItems.map((item) => (
                <div
                  key={item.wishlistId}
                  className="h-[500px] animate-pulse rounded-[16px] border border-[#F2E4E8] bg-white"
                />
              ))}
            </div>
          ) : (
            <div className={gridClassName}>
              <AnimatePresence mode="popLayout">
                {sortedEntries.map((entry) => (
                  <motion.div
                    key={entry.wishlistId}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.28, ease: "easeOut" }}
                    className="flex h-full min-w-0"
                  >
                    <WishlistProductItem
                      wishlistId={entry.wishlistId}
                      product={entry.product}
                      reviewSummary={summaries[entry.product.id]}
                      listView={viewMode === "list"}
                      onRemoved={handleRemoved}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>
      )}

      <WishlistRecommended products={recommendedProducts} />
      <WishlistExploreCta />
    </motion.main>
  );
}
