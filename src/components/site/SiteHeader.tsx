"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, Search, ShoppingBag, User } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BrandLockup } from "@/components/BrandLockup";
import { cn } from "@/lib/cn";
import { getCategoryUrl } from "@/lib/categories/category-url";
import { useCartStore } from "@/stores/cart";
import { useWishlistStore } from "@/stores/wishlist";
import type { Category } from "@/types";

const STATIC_NAV = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/products" },
  { label: "Offers", href: "/offers" },
  { label: "About Us", href: "/about" },
  { label: "Contact Us", href: "/contact" }
] as const;

export function SiteHeader() {
  const cartCount = useCartStore((s) => s.count());
  const wishCount = useWishlistStore((s) => s.ids.size);
  const [scrolled, setScrolled] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    void fetch("/api/categories")
      .then((res) => res.json())
      .then((data: { categories?: Category[] }) => setCategories(data.categories ?? []))
      .catch(() => setCategories([]));
  }, []);

  const nav = useMemo(
    () => [
      ...STATIC_NAV.slice(0, 2),
      ...categories.map((category) => ({
        label: category.name,
        href: getCategoryUrl(category)
      })),
      ...STATIC_NAV.slice(2)
    ],
    [categories]
  );

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const shell = useMemo(
    () =>
      cn(
        "transition duration-300",
        scrolled
          ? "bg-white/90 border-b border-blush-100 shadow-sm"
          : "bg-white/55 border-b border-transparent"
      ),
    [scrolled]
  );

  return (
    <header className="sticky top-0 z-50">
      <div className={cn(shell, "backdrop-blur-xl")}>
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="flex items-center gap-3">
            <BrandLockup variant="dark" />

            <div className="hidden lg:flex items-center gap-5 ml-8 text-sm text-maroon/80">
              {nav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="relative hover:text-maroon transition after:absolute after:-bottom-1 after:left-0 after:h-px after:w-0 after:bg-roseGold/70 after:transition-all hover:after:w-full"
                >
                  {n.label}
                </Link>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2 rounded-full bg-white/70 border border-blush-100 px-4 h-10 shadow-sm">
                <Search className="h-4 w-4 text-maroon/60" />
                <input
                  aria-label="Search products"
                  placeholder="Search blouses…"
                  className="w-56 bg-transparent outline-none text-sm placeholder:text-maroon/40"
                />
              </div>

              <IconButton href="/wishlist" label="Wishlist">
                <Heart className="h-5 w-5" />
                {wishCount > 0 && <Dot value={wishCount} />}
              </IconButton>
              <IconButton href="/cart" label="Cart">
                <ShoppingBag className="h-5 w-5" />
                {cartCount > 0 && <Dot value={cartCount} />}
              </IconButton>
              <IconButton href="/account" label="Account">
                <User className="h-5 w-5" />
              </IconButton>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="lg:hidden mt-3 overflow-x-auto"
          >
            <div className="flex gap-3 text-xs text-maroon/80 whitespace-nowrap pb-1">
              {nav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="rounded-full border border-blush-100 bg-white/60 px-3 py-2 hover:bg-white/80 transition"
                >
                  {n.label}
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </header>
  );
}

function IconButton({
  children,
  href,
  label
}: {
  children: React.ReactNode;
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "relative h-10 w-10 rounded-full grid place-items-center border border-blush-100 bg-white/70 hover:bg-white/90 transition shadow-sm text-maroon"
      )}
    >
      {children}
    </Link>
  );
}

function Dot({ value }: { value: number }) {
  return (
    <span className="absolute -right-1 -top-1 h-5 min-w-5 px-1 rounded-full bg-maroon text-white text-[10px] grid place-items-center">
      {value > 9 ? "9+" : value}
    </span>
  );
}

