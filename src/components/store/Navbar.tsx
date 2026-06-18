"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { useCartStore } from "@/stores/cart";
import { SearchBar } from "@/components/store/SearchBar";
import { BrandLockup } from "@/components/BrandLockup";

const NAV = [
  { label: "HOME", href: "/" },
  { label: "DAILY WEAR BLOUSES", href: "/daily-wear" },
  { label: "DESIGNER WEAR BLOUSES", href: "/designer-wear" },
  { label: "PARTY WEAR BLOUSES", href: "/party-wear" },
  { label: "SOON", href: "/soon" },
  { label: "ABOUT US", href: "/about" },
  { label: "CONTACT US", href: "/contact" }
];

export function Navbar() {
  const count = useCartStore((s) => s.count());
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-accent/20 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <BrandLockup variant="dark" />

        <nav className="ml-4 hidden flex-1 items-center gap-4 text-xs font-medium text-foreground/80 xl:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="hover:text-primary transition">
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            aria-label="Search"
            onClick={() => setSearchOpen(!searchOpen)}
            className="rounded-full p-2 hover:bg-blush"
          >
            <Search className="h-5 w-5 text-primary" />
          </button>
          <Link href="/account" className="rounded-full p-2 hover:bg-blush" aria-label="Account">
            <User className="h-5 w-5 text-primary" />
          </Link>
          <Link href="/wishlist" className="rounded-full p-2 hover:bg-blush" aria-label="Wishlist">
            <Heart className="h-5 w-5 text-primary" />
          </Link>
          <Link href="/cart" className="relative rounded-full p-2 hover:bg-blush" aria-label="Cart">
            <ShoppingBag className="h-5 w-5 text-primary" />
            {mounted && count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-white">
                {count}
              </span>
            )}
          </Link>
          <button
            type="button"
            className="rounded-full p-2 xl:hidden"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="border-t border-accent/20 px-4 py-3">
          <SearchBar />
        </div>
      )}

      {open && (
        <nav className="border-t border-accent/20 px-4 py-3 xl:hidden">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="block py-2 text-sm font-medium text-foreground/80"
              onClick={() => setOpen(false)}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
