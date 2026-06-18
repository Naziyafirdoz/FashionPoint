"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import type { Product } from "@/types";
import { ProductGrid } from "./ProductGrid";
import { FilterSidebar } from "./FilterSidebar";
import { AiFeaturesPanel } from "./AiFeaturesPanel";

type Props = {
  title: string;
  subtitle: string;
  categorySlug?: string;
  heroImage?: string;
};

export function CategoryListing({ title, subtitle, categorySlug, heroImage }: Props) {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      const params = new URLSearchParams(searchParams.toString());
      if (categorySlug) params.set("category", categorySlug);

      const qs = params.toString();
      try {
        const res = await fetch(`/api/products${qs ? `?${qs}` : ""}`);
        const data = await res.json();
        if (!cancelled) setProducts(data.products ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [categorySlug, searchParams]);

  const visible = products.slice(0, 12);

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-r from-blush to-white py-12">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 md:grid-cols-2">
          <div>
            <h1 className="font-display text-3xl font-bold text-primary md:text-4xl">{title}</h1>
            <p className="mt-2 text-foreground/70">{subtitle}</p>
          </div>
          {heroImage && (
            <div className="relative hidden h-48 md:block">
              <Image src={heroImage} alt="" fill className="object-contain object-right" />
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[240px_1fr_220px]">
        <FilterSidebar />
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-foreground/60">
              {loading
                ? "Loading products…"
                : `Showing 1 to ${Math.min(12, products.length)} of ${products.length} products`}
            </span>
            <select className="rounded-full border px-3 py-1 text-sm">
              <option>Sort by Latest</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
            </select>
          </div>
          {loading ? (
            <p className="text-sm text-foreground/60">Loading…</p>
          ) : visible.length === 0 ? (
            <p className="text-sm text-foreground/60">No products match your filters.</p>
          ) : (
            <ProductGrid products={visible} />
          )}
          <div className="mt-8 flex justify-center gap-2 text-sm">
            <button type="button" className="rounded px-2 hover:bg-blush">&lt;</button>
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                className={`rounded px-3 py-1 ${n === 1 ? "bg-primary text-white" : "hover:bg-blush"}`}
              >
                {n}
              </button>
            ))}
            <span>...</span>
            <button type="button" className="rounded px-2 hover:bg-blush">&gt;</button>
          </div>
        </div>
        <AiFeaturesPanel />
      </div>
      <UspStripFooter />
    </>
  );
}

function UspStripFooter() {
  return (
    <section className="border-t border-accent/20 bg-white py-8">
      <div className="mx-auto max-w-xl px-4 text-center">
        <p className="font-semibold text-primary">Subscribe for exclusive offers</p>
        <div className="mt-3 flex gap-2">
          <input type="email" placeholder="Your email" className="flex-1 rounded-full border px-4 py-2 text-sm" />
          <button type="button" className="btn-primary">Subscribe</button>
        </div>
      </div>
    </section>
  );
}
