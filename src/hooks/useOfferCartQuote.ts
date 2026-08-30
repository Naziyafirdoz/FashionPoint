"use client";

import { useEffect, useMemo, useState } from "react";
import type { CartItem } from "@/types";
import type { AppliedOffer } from "@/lib/offers/types";

export type OfferQuoteLine = {
  productId: string;
  size: string;
  color: string;
  quantity: number;
  catalogUnitPrice: number;
  discountPerUnit: number;
  effectiveUnitPrice: number;
  lineDiscount: number;
  lineTotal: number;
  appliedOffer: AppliedOffer | null;
};

export type OfferQuote = {
  items: OfferQuoteLine[];
  subtotalBeforeOffers: number;
  totalOfferDiscount: number;
  subtotalAfterOffers: number;
};

function lineKey(item: { productId: string; size: string; color: string }) {
  return `${item.productId}::${item.size}::${item.color}`;
}

export function useOfferCartQuote(items: CartItem[]) {
  const [quote, setQuote] = useState<OfferQuote | null>(null);

  const signature = useMemo(
    () =>
      items
        .map((item) => `${item.productId}:${item.size}:${item.color}:${item.quantity}`)
        .join("|"),
    [items]
  );

  useEffect(() => {
    if (items.length === 0) {
      setQuote(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    void (async () => {
      try {
        const res = await fetch("/api/checkout/quote", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: items.map((item) => ({
              productId: item.productId,
              name: item.name,
              size: item.size,
              color: item.color,
              quantity: item.quantity,
              image: item.image,
              slug: item.slug
            }))
          }),
          signal: controller.signal
        });
        const data = await res.json();
        if (!res.ok || cancelled || !Array.isArray(data.items)) return;
        setQuote({
          items: data.items as OfferQuoteLine[],
          subtotalBeforeOffers: Number(data.subtotalBeforeOffers) || 0,
          totalOfferDiscount: Number(data.totalOfferDiscount) || 0,
          subtotalAfterOffers: Number(data.subtotalAfterOffers) || 0
        });
      } catch {
        if (!cancelled) setQuote(null);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [items, signature]);

  const linesByKey = useMemo(() => {
    const map = new Map<string, OfferQuoteLine>();
    for (const line of quote?.items ?? []) {
      map.set(lineKey(line), line);
    }
    return map;
  }, [quote]);

  return { quote, linesByKey };
}
