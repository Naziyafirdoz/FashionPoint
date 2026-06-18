"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Sparkles, Star } from "lucide-react";

const USPS = [
  { title: "100% Readymade", icon: "✓" },
  { title: "Premium Quality", icon: "✓" },
  { title: "Perfect Fit", icon: "✓" },
  { title: "Comfortable All Day", icon: "✓" }
];

export function HeroBanner() {
  return (
    <section className="floral-bg relative overflow-hidden">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 lg:grid-cols-3 lg:items-center lg:py-16">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="font-display text-2xl italic text-secondary">Stitching</p>
          <h1 className="font-display text-4xl font-bold leading-tight text-primary md:text-5xl">
            STYLE & CONFIDENCE
          </h1>
          <p className="mt-2 text-lg text-foreground/70">For Every Occasion</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {USPS.map((u) => (
              <div key={u.title} className="flex items-center gap-2 text-sm">
                <span className="text-secondary">{u.icon}</span>
                <span className="font-medium">{u.title}</span>
              </div>
            ))}
          </div>
          <Link href="/daily-wear" className="btn-primary mt-8 inline-flex">
            SHOP NOW
          </Link>
          <p className="mt-4 flex items-center gap-1 text-sm text-foreground/70">
            Trusted by 50K+ Happy Customers
            <span className="flex text-secondary">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="h-4 w-4 fill-current" />
              ))}
            </span>
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="relative flex justify-center"
        >
          <div className="relative h-80 w-80 rounded-full bg-primary/90 p-2 md:h-96 md:w-96">
            <Image
              src="https://images.unsplash.com/photo-1610030469983-98e550b8b4b4?auto=format&fit=crop&w=600&q=80"
              alt="Model in pink saree blouse"
              fill
              className="rounded-full object-cover"
              priority
            />
            <span className="absolute -right-2 top-8 animate-pulse rounded-full bg-accent px-3 py-1 text-xs font-bold text-white">
              AI STYLE SUGGESTION
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="card-store"
        >
          <div className="mb-4 rounded-2xl bg-blush p-4 text-center text-xs text-foreground/60">
            📱 AI Size · Color Match · Style Chat
          </div>
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-primary">
            <Sparkles className="h-5 w-5 text-secondary" />
            AI FEATURES
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-foreground/80">
            <li>• AI Size Finder — perfect fit in seconds</li>
            <li>• Saree Color Matcher — match your saree</li>
            <li>• AI Style Assistant — personalized picks</li>
            <li>• Virtual Try-On — coming soon</li>
          </ul>
          <Link href="/ai-features" className="btn-primary mt-6 w-full text-center">
            TRY AI MAGIC
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
