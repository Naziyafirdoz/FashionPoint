"use client";

import { useEffect, useMemo, useState } from "react";
import { PRODUCTS } from "@/lib/products";
import { ProductGrid } from "@/components/shop/ProductGrid";

export function RecentlyViewed() {
  const [slugs, setSlugs] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("fp_recent");
      setSlugs(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      setSlugs([]);
    }
  }, []);

  const items = useMemo(() => {
    const set = new Set(slugs);
    const ordered = slugs
      .map((s) => PRODUCTS.find((p) => p.slug === s))
      .filter(Boolean) as typeof PRODUCTS;
    const fallback = PRODUCTS.filter((p) => !set.has(p.slug)).slice(0, 3);
    return ordered.concat(fallback).slice(0, 6);
  }, [slugs]);

  if (!items.length) return null;

  return (
    <section className="py-12">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <div className="font-[family-name:var(--font-display)] text-2xl text-maroon">
            Recently viewed
          </div>
          <div className="text-sm text-maroon/70">
            Pick up where you left off.
          </div>
        </div>
      </div>
      <ProductGrid products={items} />
    </section>
  );
}

