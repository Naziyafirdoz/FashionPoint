"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Clock3, Heart, IndianRupee, ShoppingBag, Tag } from "lucide-react";
import { WISHLIST_CONTAINER_CLASS } from "@/components/wishlist/constants";

type WishlistSummaryCardsProps = {
  savedCount: number;
  recentlyAddedCount: number | null;
  availableCount: number | null;
  readyCount: number | null;
  totalValue: number | null;
};

type SummaryCard = {
  key: string;
  title: string;
  value: string;
  icon: ReactNode;
  hidden?: boolean;
};

export function WishlistSummaryCards({
  savedCount,
  recentlyAddedCount,
  availableCount,
  readyCount,
  totalValue
}: WishlistSummaryCardsProps) {
  const cards: SummaryCard[] = [
    {
      key: "saved",
      title: "Saved Items",
      value: savedCount.toLocaleString("en-IN"),
      icon: <Heart className="h-5 w-5 text-primary" strokeWidth={1.75} aria-hidden="true" />
    },
    {
      key: "recent",
      title: "Recently Added",
      value: recentlyAddedCount?.toLocaleString("en-IN") ?? "—",
      icon: <Clock3 className="h-5 w-5 text-secondary" strokeWidth={1.75} aria-hidden="true" />,
      hidden: recentlyAddedCount === null
    },
    {
      key: "available",
      title: "Available Products",
      value: availableCount?.toLocaleString("en-IN") ?? "—",
      icon: <Tag className="h-5 w-5 text-primary" strokeWidth={1.75} aria-hidden="true" />,
      hidden: availableCount === null
    },
    {
      key: "ready",
      title: "Move to Cart Ready",
      value: readyCount?.toLocaleString("en-IN") ?? "—",
      icon: <ShoppingBag className="h-5 w-5 text-secondary" strokeWidth={1.75} aria-hidden="true" />,
      hidden: readyCount === null
    },
    {
      key: "value",
      title: "Total Wishlist Value",
      value: totalValue !== null ? `₹${totalValue.toLocaleString("en-IN")}` : "—",
      icon: <IndianRupee className="h-5 w-5 text-primary" strokeWidth={1.75} aria-hidden="true" />,
      hidden: totalValue === null
    }
  ];

  const visibleCards = cards.filter((card) => !card.hidden);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut", delay: 0.06 }}
      className={`${WISHLIST_CONTAINER_CLASS} grid grid-cols-2 gap-3 pt-8 sm:gap-4 md:grid-cols-3 xl:grid-cols-5`}
    >
      {visibleCards.map((card) => (
        <div
          key={card.key}
          className="rounded-[16px] border border-[#F3E5E8] bg-white px-4 py-4 shadow-[0_4px_16px_rgba(122,13,43,0.04)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(122,13,43,0.08)] sm:px-5"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFF5F7]">
              {card.icon}
            </span>
            <p className="text-[11px] font-medium uppercase leading-tight tracking-wide text-[#888888]">
              {card.title}
            </p>
          </div>
          <p className="mt-3 font-display text-2xl font-bold leading-none text-[#2A2A2A] sm:text-[1.75rem]">
            {card.value}
          </p>
        </div>
      ))}
    </motion.div>
  );
}
