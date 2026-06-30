"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ShoppingBag } from "lucide-react";

export function WishlistEmptyState() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut", delay: 0.1 }}
      className="mx-auto flex w-full max-w-lg flex-col items-center py-16 text-center"
      aria-label="Empty wishlist"
    >
      <div className="flex h-24 w-24 items-center justify-center rounded-full border border-[#F3E5E8] bg-white shadow-[0_8px_28px_rgba(122,13,43,0.06)]">
        <span className="text-4xl text-[#7B0D2B]/70" aria-hidden="true">
          ♡
        </span>
      </div>
      <h2 className="mt-6 font-display text-2xl font-bold text-[#2A2A2A]">
        Your wishlist is empty
      </h2>
      <p className="mt-2 text-sm text-[#666666] sm:text-base">
        Save your favourite blouses and access them anytime.
      </p>
      <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#7B0D2B] px-6 text-sm font-semibold text-white shadow-[0_5px_16px_rgba(123,13,43,0.14)] transition duration-300 hover:bg-[#8f1230] hover:shadow-[0_7px_20px_rgba(123,13,43,0.2)]"
        >
          Explore Collections
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#7B0D2B]/50 bg-white px-6 text-sm font-semibold text-[#7B0D2B] transition duration-300 hover:border-[#7B0D2B] hover:bg-[#FFF5F7]"
        >
          <ShoppingBag className="h-4 w-4" aria-hidden="true" />
          Continue Shopping
        </Link>
      </div>
    </motion.section>
  );
}
