"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { WISHLIST_CONTAINER_CLASS } from "@/components/wishlist/constants";

const FLORAL_LEFT = "/assets/hero/floral-left.png";
const FLORAL_RIGHT = "/assets/hero/floral-right.png";

type WishlistHeroProps = {
  savedCount: number;
};

export function WishlistHero({ savedCount }: WishlistHeroProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className={`${WISHLIST_CONTAINER_CLASS} pt-5`}
      aria-label="Wishlist hero"
    >
      <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-[#FFF4EE] via-[#FFF7F4] to-[#FCEEF2] px-6 py-8 shadow-[0_8px_30px_rgba(122,13,43,0.06)] sm:px-10 sm:py-9">
        <Image
          src={FLORAL_LEFT}
          alt=""
          width={180}
          height={180}
          aria-hidden
          className="pointer-events-none absolute -left-2 bottom-0 h-auto w-[min(34%,170px)] opacity-90"
        />
        <Image
          src={FLORAL_RIGHT}
          alt=""
          width={180}
          height={180}
          aria-hidden
          className="pointer-events-none absolute -right-2 bottom-0 h-auto w-[min(34%,170px)] opacity-90"
        />

        <div className="relative z-10 mx-auto max-w-2xl text-center">
          <h1 className="font-display text-[2rem] font-bold leading-tight tracking-tight text-[#7B0D2B] sm:text-[2.35rem]">
            Wishlist <span aria-hidden="true">♡</span>
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#555555] sm:text-[15px]">
            Keep your favourite blouses in one place and shop anytime.
          </p>
          <div className="mt-4 flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#7B0D2B] px-4 py-1.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(123,13,43,0.2)]">
              <span aria-hidden="true">❤️</span>
              Saved Items: {savedCount.toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
