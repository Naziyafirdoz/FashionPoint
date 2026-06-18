"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import type { Product } from "@/lib/types";
import { MediaPlaceholder } from "@/components/placeholders/MediaPlaceholder";

export function TrendingCarousel({ products }: { products: Product[] }) {
  return (
    <section className="rounded-[28px] border border-blush-100 bg-white/60 p-6 md:p-8 shadow-sm">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="font-[family-name:var(--font-display)] text-2xl text-maroon">
            Trending Now
          </div>
          <div className="text-sm text-maroon/70">
            Premium edits inspired by luxury Indian fashion.
          </div>
        </div>
        <Link
          href="/category/new"
          className="text-sm text-maroon hover:text-maroon/80 inline-flex items-center gap-1"
        >
          See more <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto">
        <div className="flex gap-4 min-w-max pb-2">
          {products.map((p, idx) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4, delay: idx * 0.05, ease: "easeOut" }}
              className="w-[260px]"
            >
              <Link
                href={`/products/${p.slug}`}
                className="block rounded-[22px] overflow-hidden border border-blush-100 bg-white/65 hover:shadow-soft transition"
              >
                <div className="relative">
                  <div className="p-3">
                    <MediaPlaceholder
                      variant="category"
                      label="Trending product image"
                      hint="Upload product mockups later"
                      className="rounded-[18px]"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-maroon/40 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <div className="text-sm font-semibold leading-snug">
                      {p.name}
                    </div>
                    <div className="text-xs opacity-90">
                      ₹{p.priceInr.toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

