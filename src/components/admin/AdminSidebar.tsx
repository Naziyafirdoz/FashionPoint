"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  BarChart3,
  Bell,
  ChevronDown,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Sparkles,
  Users
} from "lucide-react";

type NavLink = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
};

type ProductChild = {
  href: string;
  label: string;
  isActive: (path: string, featured: boolean) => boolean;
};

const PRODUCT_CHILDREN: ProductChild[] = [
  {
    href: "/admin/products",
    label: "All Products",
    isActive: (path, featured) =>
      !featured &&
      (path === "/admin/products" || /^\/admin\/products\/[^/]+\/edit$/.test(path))
  },
  {
    href: "/admin/products/new",
    label: "Add New Product",
    isActive: (path) => path === "/admin/products/new"
  },
  {
    href: "/admin/categories",
    label: "Categories",
    isActive: (path) => path.startsWith("/admin/categories")
  },
  {
    href: "/admin/inventory",
    label: "Inventory",
    isActive: (path) => path.startsWith("/admin/inventory")
  },
  {
    href: "/admin/reviews",
    label: "Product Reviews",
    isActive: (path) => path.startsWith("/admin/reviews")
  },
  {
    href: "/admin/products?featured=true",
    label: "Featured Products",
    isActive: (path, featured) => path === "/admin/products" && featured
  }
];

const PRODUCT_SECTION_PATHS = [
  "/admin/products",
  "/admin/categories",
  "/admin/inventory",
  "/admin/reviews"
];

const LINKS: NavLink[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/ai-features", label: "AI Features", icon: Sparkles },
  { href: "/admin/marketing", label: "Marketing", icon: BarChart3 },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/blogs", label: "Blogs", icon: Package },
  { href: "/admin/settings", label: "Settings", icon: Settings }
];

function isProductSectionActive(path: string) {
  return PRODUCT_SECTION_PATHS.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
}

function AdminSidebarNav() {
  const path = usePathname();
  const searchParams = useSearchParams();
  const featured = searchParams.get("featured") === "true";
  const productSectionActive = isProductSectionActive(path);
  const [productsOpen, setProductsOpen] = useState(productSectionActive);

  useEffect(() => {
    if (productSectionActive) {
      setProductsOpen(true);
    }
  }, [productSectionActive]);

  const linkClass = (active: boolean) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
      active ? "bg-primary text-white" : "text-foreground/70 hover:bg-blush"
    }`;

  const childLinkClass = (active: boolean) =>
    `block rounded-lg py-1.5 pl-9 pr-3 text-sm ${
      active ? "bg-primary text-white font-medium" : "text-foreground/70 hover:bg-blush"
    }`;

  return (
    <nav className="mt-6 space-y-1">
      <Link href="/admin/dashboard" className={linkClass(path.startsWith("/admin/dashboard"))}>
        <LayoutDashboard className="h-4 w-4" />
        Dashboard
      </Link>

      <div>
        <button
          type="button"
          onClick={() => setProductsOpen((open) => !open)}
          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm ${
            productSectionActive ? "bg-primary text-white" : "text-foreground/70 hover:bg-blush"
          }`}
          aria-expanded={productsOpen}
        >
          <Package className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">Products</span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition-transform ${productsOpen ? "rotate-180" : ""}`}
          />
        </button>

        {productsOpen && (
          <div className="mt-1 space-y-0.5">
            {PRODUCT_CHILDREN.map((child) => {
              const active = child.isActive(path, featured);
              return (
                <Link key={child.href} href={child.href} className={childLinkClass(active)}>
                  {child.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {LINKS.slice(1).map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className={linkClass(path.startsWith(href))}>
          <Icon className="h-4 w-4" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

function AdminSidebarFallback() {
  return (
    <nav className="mt-6 space-y-1">
      {LINKS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground/70 hover:bg-blush"
        >
          <Icon className="h-4 w-4" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function AdminSidebar() {
  return (
    <aside className="w-56 shrink-0 border-r bg-white p-4">
      <Link href="/admin/dashboard" className="font-display text-lg font-bold text-primary">
        Admin
      </Link>
      <Suspense fallback={<AdminSidebarFallback />}>
        <AdminSidebarNav />
      </Suspense>
    </aside>
  );
}
