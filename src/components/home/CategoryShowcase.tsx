"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { MediaPlaceholder } from "@/components/placeholders/MediaPlaceholder";
import { Button } from "@/components/ui/Button";
import { getCategoryUrl } from "@/lib/categories/category-url";
import type { Category } from "@/types";

export function CategoryShowcase() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    void fetch("/api/categories")
      .then((res) => res.json())
      .then((data: { categories?: Category[] }) => {
        setCategories(data.categories ?? []);
      })
      .catch(() => setCategories([]));
  }, []);

  return (
    <section className="py-14">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <div className="font-[family-name:var(--font-display)] text-2xl text-maroon">
            Shop by category
          </div>
          <div className="text-sm text-maroon/70">
            Luxury-ready structure — collections load from your catalog.
          </div>
        </div>
        <Link
          href="/products"
          className="text-sm text-maroon hover:text-maroon/80 inline-flex items-center gap-1"
        >
          View all <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {categories.map((category, idx) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.45, delay: idx * 0.06, ease: "easeOut" }}
            className="group rounded-[28px] border border-blush-100 bg-white/60 shadow-sm hover:shadow-soft transition overflow-hidden"
          >
            <div className="p-4">
              <MediaPlaceholder
                variant="category"
                label="Upload category image later"
                hint="Premium gradient mock"
                className="rounded-[22px]"
              />
              <div className="mt-5 flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold text-maroon">{category.name}</div>
                </div>
              </div>
              <div className="mt-5">
                <Button href={getCategoryUrl(category)} variant="outline" className="w-full">
                  Explore
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

