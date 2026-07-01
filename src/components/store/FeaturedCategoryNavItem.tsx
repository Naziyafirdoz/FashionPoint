"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CategoryMegaMenu } from "@/components/store/category-mega-menu/CategoryMegaMenu";
import { cn } from "@/lib/cn";
import type { NavDropdownMap } from "@/lib/categories/nav-dropdown";
import type { NavCategoryLink } from "@/lib/categories/nav-categories";

const CLOSE_DELAY_MS = 180;

type FeaturedCategoryNavItemProps = {
  item: NavCategoryLink;
  linkClassName: string;
  dropdowns: NavDropdownMap;
  loading: boolean;
  onOpen: () => void;
};

export function FeaturedCategoryNavItem({
  item,
  linkClassName,
  dropdowns,
  loading,
  onOpen
}: FeaturedCategoryNavItemProps) {
  const slug = item.slug;
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const closeTimerRef = useRef<number | null>(null);
  const data = dropdowns[slug];

  const clearCloseTimer = () => {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const handleEnter = () => {
    clearCloseTimer();
    onOpen();
    setOpen(true);
  };

  const handleLeave = () => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };

  useEffect(() => {
    if (open) {
      const frame = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }
    setVisible(false);
  }, [open]);

  return (
    <div className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <Link href={item.href} className={cn("inline-flex items-center gap-0.5", linkClassName)}>
        {item.label}
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform duration-200", open && "rotate-180")}
        />
      </Link>

      {open && (
        <div
          className="absolute left-0 top-full z-[60] pt-2 lg:left-1/2 lg:-translate-x-1/2 xl:left-0 xl:translate-x-0"
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
        >
          {data ? (
            <div
              className={cn(
                "transition-opacity duration-200 ease-out",
                visible ? "opacity-100" : "opacity-0"
              )}
            >
              <div className="hidden xl:block">
                <CategoryMegaMenu
                  category={data}
                  subCategories={data.sub_categories}
                  variant="full"
                />
              </div>
              <div className="xl:hidden">
                <CategoryMegaMenu
                  category={data}
                  subCategories={data.sub_categories}
                  variant="compact"
                />
              </div>
            </div>
          ) : loading ? (
            <div
              className={cn(
                "w-56 rounded-xl border border-accent/20 bg-white px-4 py-3 text-xs text-foreground/60 shadow-lg transition-opacity duration-200 ease-out",
                visible ? "opacity-100" : "opacity-0"
              )}
            >
              Loading…
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
