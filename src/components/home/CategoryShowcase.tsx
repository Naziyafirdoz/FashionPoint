"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { MediaPlaceholder } from "@/components/placeholders/MediaPlaceholder";
import { Button } from "@/components/ui/Button";

const cats = [
  {
    title: "Daily Blouses",
    desc: "Everyday silhouettes with premium comfort & clean finishing.",
    href: "/category/daily"
  },
  {
    title: "Designer Blouses",
    desc: "Wedding, festive and party edits with luxe details.",
    href: "/category/designer"
  },
  {
    title: "New Arrivals",
    desc: "Fresh drops with limited stock urgency — boutique feel.",
    href: "/category/new"
  }
];

export function CategoryShowcase() {
  return (
    <section className="py-14">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <div className="font-[family-name:var(--font-display)] text-2xl text-maroon">
            Shop by category
          </div>
          <div className="text-sm text-maroon/70">
            Luxury-ready structure — swap placeholders with your images anytime.
          </div>
        </div>
        <Link
          href="/category/new"
          className="text-sm text-maroon hover:text-maroon/80 inline-flex items-center gap-1"
        >
          View all <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {cats.map((c, idx) => (
          <motion.div
            key={c.href}
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
                  <div className="text-lg font-semibold text-maroon">
                    {c.title}
                  </div>
                  <div className="mt-1 text-sm text-maroon/70">{c.desc}</div>
                </div>
              </div>
              <div className="mt-5">
                <Button href={c.href} variant="outline" className="w-full">
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

