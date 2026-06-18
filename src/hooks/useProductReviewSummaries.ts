"use client";

import { useEffect, useMemo, useState } from "react";
import type { ProductReviewSummary } from "@/lib/reviews/types";

export function useProductReviewSummaries(productIds: string[]) {
  const [summaries, setSummaries] = useState<Record<string, ProductReviewSummary>>({});
  const [loading, setLoading] = useState(false);

  const idsKey = useMemo(
    () => [...new Set(productIds.filter(Boolean))].sort().join(","),
    [productIds]
  );

  useEffect(() => {
    const ids = idsKey ? idsKey.split(",") : [];
    if (ids.length === 0) {
      setSummaries({});
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`/api/reviews?product_ids=${encodeURIComponent(idsKey)}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setSummaries(data.summaries ?? {});
        }
      })
      .catch(() => {
        if (!cancelled) setSummaries({});
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  return { summaries, loading };
}
