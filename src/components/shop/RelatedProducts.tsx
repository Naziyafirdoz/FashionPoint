"use client";

import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/shop/ProductCard";

export function RelatedProducts({ products }: { products: Product[] }) {
  return (
    <section className="rounded-[28px] border border-blush-100 bg-white/60 p-5 shadow-sm">
      <div className="font-[family-name:var(--font-display)] text-xl text-maroon">
        Related products
      </div>
      <div className="mt-4 grid gap-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}

