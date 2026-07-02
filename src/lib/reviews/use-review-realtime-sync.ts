"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { subscribeReviewSyncBus } from "@/lib/reviews/review-sync-bus";

type UseReviewRealtimeSyncOptions = {
  /** When set, only sync if the event targets this product (or has no product filter). */
  productId?: string;
  enabled?: boolean;
};

function shouldSyncForProduct(
  eventProductId: string | null | undefined,
  filterProductId: string | undefined
): boolean {
  if (!filterProductId) return true;
  if (!eventProductId) return true;
  return eventProductId === filterProductId;
}

/**
 * Refetch review-driven UI when reviews change (Supabase realtime + cross-tab bus).
 */
export function useReviewRealtimeSync(
  onSync: () => void,
  { productId, enabled = true }: UseReviewRealtimeSyncOptions = {}
): void {
  useEffect(() => {
    if (!enabled) return;

    const handleEvent = (eventProductId?: string | null) => {
      if (!shouldSyncForProduct(eventProductId, productId)) return;
      onSync();
    };

    const unsubscribeBus = subscribeReviewSyncBus(({ productId: eventProductId }) => {
      handleEvent(eventProductId);
    });

    const supabase = createClient();
    const channel = supabase
      .channel(productId ? `reviews-sync-${productId}` : "reviews-sync-all")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reviews",
          ...(productId ? { filter: `product_id=eq.${productId}` } : {})
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as { product_id?: string } | null;
          handleEvent(row?.product_id ?? null);
        }
      )
      .subscribe();

    return () => {
      unsubscribeBus();
      void supabase.removeChannel(channel);
    };
  }, [enabled, onSync, productId]);
}
