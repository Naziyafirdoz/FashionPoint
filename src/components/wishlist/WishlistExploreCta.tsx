"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { WISHLIST_CONTAINER_CLASS } from "@/components/wishlist/constants";

export function WishlistExploreCta() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay: 0.08 }}
      className={`${WISHLIST_CONTAINER_CLASS} flex justify-center pt-10`}
    >
      <Link
        href="/"
        className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-8 text-sm font-semibold text-white shadow-[0_5px_18px_rgb(var(--primary-rgb)/0.18)] transition duration-300 hover:bg-primary/90 hover:shadow-[0_8px_24px_rgb(var(--primary-rgb)/0.24)]"
      >
        Explore More Collections
        <ArrowRight
          className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </Link>
    </motion.section>
  );
}
