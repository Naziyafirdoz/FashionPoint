"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/types";
import { ProductGrid } from "@/components/store/ProductGrid";

const RECENT_STORAGE_KEY = "fp_recent";

export function CategoryRecentlyViewed() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const raw = localStorage.getItem(RECENT_STORAGE_KEY);
        const slugs = raw ? (JSON.parse(raw) as string[]) : [];
        const trimmed = slugs.filter(Boolean).slice(0, 6);

        if (trimmed.length === 0) {
          if (!cancelled) setProducts([]);
          return;
        }

        const params = new URLSearchParams({ slugs: trimmed.join(",") });
        const res = await fetch(`/api/products?${params.toString()}`, { cache: "no-store" });
        const data = await res.json();

        if (!cancelled) {
          setProducts(data.products ?? []);
        }
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || products.length === 0) return null;

  return (
    <section className="border-t border-[#F2E4E8] bg-[#FFF8F8] py-10">
      <div className="mx-auto w-full max-w-[1600px] px-6">
        <h2 className="font-display text-2xl font-bold text-primary">Recently Viewed</h2>
        <p className="mt-1 text-sm text-[#666666]">Pick up where you left off.</p>
        <div className="mt-6">
          <ProductGrid products={products} layout="recommendation" />
        </div>
      </div>
    </section>
  );
}
