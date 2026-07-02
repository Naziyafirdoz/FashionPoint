"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ProductReviewSummary } from "@/lib/reviews/types";
import { useReviewRealtimeSync } from "@/lib/reviews/use-review-realtime-sync";

export function useProductReviewSummaries(productIds: string[]) {
  const [summaries, setSummaries] = useState<Record<string, ProductReviewSummary>>({});
  const [loading, setLoading] = useState(false);

  const idsKey = useMemo(
    () => [...new Set(productIds.filter(Boolean))].sort().join(","),
    [productIds]
  );

  const loadSummaries = useCallback(async (silent = false) => {
    const ids = idsKey ? idsKey.split(",") : [];
    if (ids.length === 0) {
      setSummaries({});
      return;
    }

    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/reviews?product_ids=${encodeURIComponent(idsKey)}`, {
        cache: "no-store"
      });
      const data = await res.json();
      setSummaries(data.summaries ?? {});
    } catch {
      setSummaries({});
    } finally {
      if (!silent) setLoading(false);
    }
  }, [idsKey]);

  useEffect(() => {
    void loadSummaries();
  }, [loadSummaries]);

  useReviewRealtimeSync(() => {
    void loadSummaries(true);
  }, { enabled: Boolean(idsKey) });

  return { summaries, loading };
}
