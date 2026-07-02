"use client";

import { useEffect, useRef } from "react";
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

function createReviewSyncChannelName(productId: string | undefined): string {
  const suffix =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  return productId ? `reviews-sync-${productId}-${suffix}` : `reviews-sync-all-${suffix}`;
}

/**
 * Refetch review-driven UI when reviews change (Supabase realtime + cross-tab bus).
 */
export function useReviewRealtimeSync(
  onSync: () => void,
  { productId, enabled = true }: UseReviewRealtimeSyncOptions = {}
): void {
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;

  useEffect(() => {
    if (!enabled) return;

    const handleEvent = (eventProductId?: string | null) => {
      if (!shouldSyncForProduct(eventProductId, productId)) return;
      onSyncRef.current();
    };

    const unsubscribeBus = subscribeReviewSyncBus(({ productId: eventProductId }) => {
      handleEvent(eventProductId);
    });

    const supabase = createClient();
    const channelName = createReviewSyncChannelName(productId);
    const channel = supabase
      .channel(channelName)
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
  }, [enabled, productId]);
}
