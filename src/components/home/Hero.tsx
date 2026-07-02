"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { MediaPlaceholder } from "@/components/placeholders/MediaPlaceholder";

export function Hero() {
  return (
    <section className="relative overflow-hidden min-h-[calc(100vh-64px)] grid items-center">
      <div className="mx-auto max-w-6xl px-4 pt-10 pb-14 md:pt-16 md:pb-16">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="inline-flex items-center gap-2 rounded-full border border-blush-200 bg-white/60 px-4 py-2 text-xs text-maroon/70 shadow-sm"
            >
              <Sparkles className="h-4 w-4 text-roseGold" />
              AI fit + saree‑match recommendations
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.05, ease: "easeOut" }}
              className="mt-5 font-[family-name:var(--font-display)] text-4xl md:text-5xl leading-[1.05] tracking-tight text-maroon"
            >
              Perfect Fit. Every Time.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.12, ease: "easeOut" }}
              className="mt-4 text-base text-maroon/75 max-w-prose"
            >
              Ready‑made blouses for every occasion—designed for elegance,
              comfort and confidence. Discover premium fabrics, flattering cuts,
              and limited stock drops.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.18, ease: "easeOut" }}
              className="mt-7 flex flex-wrap gap-3"
            >
            <Button href="/products" size="lg">
              Shop Now
            </Button>
              <Button href="/ai" variant="ghost" size="lg">
                Try AI features
              </Button>
            </motion.div>

            <div className="mt-8 grid grid-cols-3 gap-3">
              <Pill title="Collections" href="/products" />
              <Pill title="AI Tools" href="/ai-features" />
              <Pill title="Offers" href="/offers" />
            </div>
          </div>

          <div className="relative">
            <FloatingOrbs />
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative rounded-[32px] overflow-hidden shadow-soft border border-blush-100 bg-white/60 p-3"
            >
              <MediaPlaceholder
                variant="hero"
                label="Your Premium Model/Blouse Image Here"
                hint="No images yet — this luxury placeholder keeps the hero premium."
                className="rounded-[26px]"
              />
              <div className="absolute bottom-4 left-4 right-4 glass rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-maroon/60">
                      Coming soon
                    </div>
                    <div className="text-sm font-semibold text-maroon">
                      Bridal & Festive Designer Series
                    </div>
                  </div>
                  <Button href="/products" size="sm">
                    Explore
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FloatingOrbs() {
  return (
    <>
      <motion.div
        aria-hidden
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="absolute -top-10 -left-10 h-56 w-56 rounded-full bg-blush-200/60 blur-3xl"
      />
      <motion.div
        aria-hidden
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        className="absolute -bottom-10 -right-10 h-56 w-56 rounded-full bg-lightGold/40 blur-3xl"
      />
      <motion.div
        aria-hidden
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-20 right-10 h-24 w-24 rounded-full bg-roseGold/20 blur-2xl"
      />
    </>
  );
}

function Pill({ title, href }: { title: string; href: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-blush-100 bg-white/60 px-4 py-3 text-sm text-maroon/80 hover:bg-white/80 transition shadow-sm"
    >
      {title}
    </Link>
  );
}

