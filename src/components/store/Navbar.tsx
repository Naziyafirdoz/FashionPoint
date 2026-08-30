"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { useCartStore } from "@/stores/cart";
import { useWishlistStore } from "@/stores/wishlist";
import { SearchBar } from "@/components/store/SearchBar";
import { BrandLockup } from "@/components/BrandLockup";
import { FeaturedCategoryNavItem } from "@/components/store/FeaturedCategoryNavItem";
import { splitCategoriesForNav, type NavCategoryLink } from "@/lib/categories/nav-categories";
import { useNavDropdownData } from "@/hooks/useNavDropdownData";
import type { Category } from "@/types";

const STATIC_NAV = [
  { label: "HOME", href: "/" },
  { label: "ABOUT US", href: "/about" },
  { label: "CONTACT US", href: "/contact" }
] as const;

type NavbarProps = {
  categories?: Category[];
  storeName: string;
  tagline?: string;
  logoUrl?: string;
};

function NavLink({
  href,
  label,
  className,
  onClick
}: {
  href: string;
  label: string;
  className: string;
  onClick?: () => void;
}) {
  return (
    <Link href={href} className={className} onClick={onClick}>
      {label}
    </Link>
  );
}

function MoreDropdown({
  items,
  className,
  linkClassName,
  onNavigate
}: {
  items: NavCategoryLink[];
  className?: string;
  linkClassName: string;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((prev) => !prev)}
        className={`inline-flex items-center gap-0.5 hover:text-primary transition ${linkClassName}`}
      >
        MORE
        <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 min-w-[12rem] overflow-hidden rounded-md border border-accent/20 bg-white shadow-lg">
          <ul className="max-h-64 overflow-y-auto py-1">
            {items.map((item) => (
              <li key={item.slug}>
                <Link
                  href={item.href}
                  className="block px-4 py-2 text-xs font-medium text-foreground/80 hover:bg-blush hover:text-primary transition"
                  onClick={() => {
                    setOpen(false);
                    onNavigate?.();
                  }}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function Navbar({ categories = [], storeName, tagline, logoUrl }: NavbarProps) {
  const count = useCartStore((s) => s.count());
  const wishlistCount = useWishlistStore((s) => s.ids.size);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

  const { featured, more } = useMemo(() => splitCategoriesForNav(categories), [categories]);
  const featuredSlugs = useMemo(
    () => featured.map((item) => item.slug),
    [featured]
  );
  const { dropdowns, loading: dropdownsLoading, loadDropdowns } = useNavDropdownData(featuredSlugs);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) setMobileMoreOpen(false);
  }, [open]);

  const desktopLinkClass = "hover:text-primary transition";
  const mobileLinkClass = "block py-2 text-sm font-medium text-foreground/80";

  return (
    <header className="sticky top-0 z-50 border-b border-accent/20 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <BrandLockup variant="dark" storeName={storeName} tagline={tagline} logoUrl={logoUrl} />

        <nav className="ml-4 hidden flex-1 items-center gap-4 text-xs font-medium text-foreground/80 lg:flex">
          <NavLink href={STATIC_NAV[0].href} label={STATIC_NAV[0].label} className={desktopLinkClass} />

          {featured.map((item) => (
            <FeaturedCategoryNavItem
              key={item.slug}
              item={item}
              linkClassName={desktopLinkClass}
              dropdowns={dropdowns}
              loading={dropdownsLoading}
              onOpen={loadDropdowns}
            />
          ))}

          {more.length > 0 && (
            <MoreDropdown items={more} linkClassName="text-xs font-medium text-foreground/80" />
          )}

          <NavLink href={STATIC_NAV[1].href} label={STATIC_NAV[1].label} className={desktopLinkClass} />
          <NavLink href={STATIC_NAV[2].href} label={STATIC_NAV[2].label} className={desktopLinkClass} />
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
          <Link href="/wishlist" className="relative rounded-full p-2 hover:bg-blush" aria-label="Wishlist">
            <Heart className="h-5 w-5 text-primary" />
            {mounted && wishlistCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-bold text-white">
                {wishlistCount}
              </span>
            )}
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
            className="rounded-full p-2 lg:hidden"
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
        <nav className="border-t border-accent/20 px-4 py-3 lg:hidden">
          <NavLink
            href={STATIC_NAV[0].href}
            label={STATIC_NAV[0].label}
            className={mobileLinkClass}
            onClick={() => setOpen(false)}
          />

          {featured.map((item) => (
            <NavLink
              key={item.slug}
              href={item.href}
              label={item.label}
              className={mobileLinkClass}
              onClick={() => setOpen(false)}
            />
          ))}

          {more.length > 0 && (
            <div>
              <button
                type="button"
                aria-expanded={mobileMoreOpen}
                onClick={() => setMobileMoreOpen((prev) => !prev)}
                className="flex w-full items-center gap-1 py-2 text-sm font-medium text-foreground/80"
              >
                MORE
                <ChevronDown className={`h-4 w-4 transition ${mobileMoreOpen ? "rotate-180" : ""}`} />
              </button>
              {mobileMoreOpen && (
                <div className="max-h-64 overflow-y-auto pl-3">
                  {more.map((item) => (
                    <NavLink
                      key={item.slug}
                      href={item.href}
                      label={item.label}
                      className={mobileLinkClass}
                      onClick={() => setOpen(false)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <NavLink
            href={STATIC_NAV[1].href}
            label={STATIC_NAV[1].label}
            className={mobileLinkClass}
            onClick={() => setOpen(false)}
          />
          <NavLink
            href={STATIC_NAV[2].href}
            label={STATIC_NAV[2].label}
            className={mobileLinkClass}
            onClick={() => setOpen(false)}
          />
        </nav>
      )}
    </header>
  );
}
