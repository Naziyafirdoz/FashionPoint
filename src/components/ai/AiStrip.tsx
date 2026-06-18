"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Palette, Ruler, Sparkles, Wand2 } from "lucide-react";

const items = [
  {
    title: "AI Blouse Recommendation",
    desc: "Based on occasion + browsing + saree color.",
    href: "/ai/recommend",
    icon: Sparkles
  },
  {
    title: "AI Size Recommendation",
    desc: "Height, weight, body type → best size.",
    href: "/ai/size",
    icon: Ruler
  },
  {
    title: "AI Color Matcher",
    desc: "Upload saree photo → matching blouses.",
    href: "/ai/color-match",
    icon: Palette
  },
  {
    title: "AI Virtual Try‑On",
    desc: "Upload photo → blouse preview (demo).",
    href: "/ai/try-on",
    icon: Wand2
  }
];

export function AiStrip() {
  return (
    <section className="py-10">
      <div className="grid gap-4 md:grid-cols-4">
        {items.map((it, idx) => {
          const Icon = it.icon;
          return (
            <motion.div
              key={it.href}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.45, delay: idx * 0.05, ease: "easeOut" }}
            >
              <Link
                href={it.href}
                className="block rounded-[22px] border border-blush-100 bg-white/60 p-5 shadow-sm hover:shadow-soft transition"
              >
                <div className="h-10 w-10 rounded-full bg-blush-100 grid place-items-center text-maroon">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-3 text-sm font-semibold text-maroon">
                  {it.title}
                </div>
                <div className="mt-1 text-xs text-maroon/65">{it.desc}</div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

