"use client";

import { motion } from "framer-motion";
import { ImageIcon, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "hero" | "product" | "thumb" | "category";

export function MediaPlaceholder({
  label = "Your Blouse Image Here",
  hint = "Upload image later",
  variant = "product",
  className
}: {
  label?: string;
  hint?: string;
  variant?: Variant;
  className?: string;
}) {
  const size =
    variant === "hero"
      ? "aspect-[4/5] md:aspect-[6/7]"
      : variant === "category"
        ? "aspect-[16/11]"
        : variant === "thumb"
          ? "aspect-square"
          : "aspect-[4/5]";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[26px] border border-blush-100 bg-white/60 shadow-sm",
        size,
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-tr from-blush-100/70 via-white/30 to-lightGold/55" />
      <div className="absolute inset-0 bg-[radial-gradient(700px_circle_at_20%_20%,rgba(183,110,121,0.22),transparent_55%),radial-gradient(600px_circle_at_85%_15%,rgba(231,215,160,0.25),transparent_55%),radial-gradient(600px_circle_at_55%_95%,rgba(255,176,202,0.28),transparent_60%)]" />

      <motion.div
        aria-hidden
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-blush-200/60 blur-3xl"
      />
      <motion.div
        aria-hidden
        animate={{ y: [0, 12, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -bottom-10 -right-10 h-44 w-44 rounded-full bg-lightGold/45 blur-3xl"
      />
      <motion.div
        aria-hidden
        animate={{ x: [0, 12, 0], y: [0, -6, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-10 right-8 h-20 w-20 rounded-full bg-roseGold/20 blur-2xl"
      />

      <div className="absolute inset-0 grid place-items-center p-8 text-center">
        <div className="glass rounded-[22px] border border-blush-100 px-5 py-4 max-w-[320px]">
          <div className="mx-auto h-11 w-11 rounded-full bg-white/70 border border-blush-100 grid place-items-center text-maroon">
            {variant === "hero" ? (
              <Sparkles className="h-5 w-5 text-roseGold" />
            ) : (
              <ImageIcon className="h-5 w-5 text-roseGold" />
            )}
          </div>
          <div className="mt-3 text-sm font-semibold text-maroon">{label}</div>
          <div className="mt-1 text-xs text-maroon/60">{hint}</div>
          <div className="mt-3 h-2 w-32 mx-auto rounded-full bg-white/60 border border-blush-100" />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 opacity-70 mix-blend-soft-light">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.25),transparent)] animate-[shine_3.2s_ease-in-out_infinite]" />
      </div>
    </div>
  );
}

