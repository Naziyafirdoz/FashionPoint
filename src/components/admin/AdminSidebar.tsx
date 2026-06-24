"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  BarChart3,
  Boxes,
  BrainCircuit,
  ChartColumnBig,
  ChevronDown,
  Download,
  FolderTree,
  LayoutDashboard,
  Lightbulb,
  ListTodo,
  MessageSquareMore,
  Package,
  PackagePlus,
  PackageSearch,
  Settings,
  ShoppingCart,
  Star,
  Stars,
  TrendingUp,
  Warehouse
} from "lucide-react";

type NavLink = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
};

type ProductChild = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  isActive: (path: string, featured: boolean) => boolean;
};

type AnalyticsChild = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  isActive: (path: string) => boolean;
};

type AIGrowthChild = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  isActive: (path: string) => boolean;
};

type ReportChild = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  isActive: (path: string) => boolean;
};

const ANALYTICS_CHILDREN: AnalyticsChild[] = [
  {
    href: "/admin/analytics",
    label: "Overview",
    icon: LayoutDashboard,
    isActive: (path) => path === "/admin/analytics"
  },
  {
    href: "/admin/analytics/sales",
    label: "Sales Analytics",
    icon: TrendingUp,
    isActive: (path) => path.startsWith("/admin/analytics/sales")
  },
  {
    href: "/admin/analytics/orders",
    label: "Order Analytics",
    icon: ShoppingCart,
    isActive: (path) => path.startsWith("/admin/analytics/orders")
  },
  {
    href: "/admin/analytics/products",
    label: "Product Analytics",
    icon: PackageSearch,
    isActive: (path) => path.startsWith("/admin/analytics/products")
  },
  {
    href: "/admin/analytics/reviews",
    label: "Review Analytics",
    icon: MessageSquareMore,
    isActive: (path) => path.startsWith("/admin/analytics/reviews")
  },
  {
    href: "/admin/analytics/inventory",
    label: "Inventory Analytics",
    icon: Boxes,
    isActive: (path) => path.startsWith("/admin/analytics/inventory")
  }
];

const AI_GROWTH_CHILDREN: AIGrowthChild[] = [
  {
    href: "/admin/ai-growth/action-center",
    label: "Next Actions",
    icon: ListTodo,
    isActive: (path) => path.startsWith("/admin/ai-growth/action-center")
  },
  {
    href: "/admin/ai-growth/suggestions",
    label: "AI Suggestions",
    icon: Lightbulb,
    isActive: (path) => path.startsWith("/admin/ai-growth/suggestions")
  }
];

const REPORT_CHILDREN: ReportChild[] = [
  {
    href: "/admin/reports/sales",
    label: "Sales Reports",
    icon: TrendingUp,
    isActive: (path) => path.startsWith("/admin/reports/sales")
  },
  {
    href: "/admin/reports/orders",
    label: "Order Reports",
    icon: ShoppingCart,
    isActive: (path) => path.startsWith("/admin/reports/orders")
  },
  {
    href: "/admin/reports/inventory",
    label: "Inventory Reports",
    icon: Boxes,
    isActive: (path) => path.startsWith("/admin/reports/inventory")
  },
  {
    href: "/admin/reports/export",
    label: "Export Center",
    icon: Download,
    isActive: (path) => path.startsWith("/admin/reports/export")
  }
];

const ANALYTICS_SECTION_PATH = "/admin/analytics";
const AI_GROWTH_SECTION_PATH = "/admin/ai-growth";
const REPORT_SECTION_PATH = "/admin/reports";

const PRODUCT_CHILDREN: ProductChild[] = [
  {
    href: "/admin/products",
    label: "All Products",
    icon: Boxes,
    isActive: (path, featured) =>
      !featured &&
      (path === "/admin/products" || /^\/admin\/products\/[^/]+\/edit$/.test(path))
  },
  {
    href: "/admin/products/new",
    label: "Add New Product",
    icon: PackagePlus,
    isActive: (path) => path === "/admin/products/new"
  },
  {
    href: "/admin/categories",
    label: "Categories",
    icon: FolderTree,
    isActive: (path) => path.startsWith("/admin/categories")
  },
  {
    href: "/admin/inventory",
    label: "Inventory",
    icon: Warehouse,
    isActive: (path) => path.startsWith("/admin/inventory")
  },
  {
    href: "/admin/reviews",
    label: "Product Reviews",
    icon: Star,
    isActive: (path) => path.startsWith("/admin/reviews")
  },
  {
    href: "/admin/products?featured=true",
    label: "Featured Products",
    icon: Stars,
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
  { href: "/admin/settings", label: "Settings", icon: Settings }
];

function isAIGrowthSectionActive(path: string) {
  return path === AI_GROWTH_SECTION_PATH || path.startsWith(`${AI_GROWTH_SECTION_PATH}/`);
}

function isAnalyticsSectionActive(path: string) {
  return (
    path === ANALYTICS_SECTION_PATH ||
    path.startsWith(`${ANALYTICS_SECTION_PATH}/`) ||
    isAIGrowthSectionActive(path)
  );
}

function isReportSectionActive(path: string) {
  return path === REPORT_SECTION_PATH || path.startsWith(`${REPORT_SECTION_PATH}/`);
}

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
  const analyticsSectionActive = isAnalyticsSectionActive(path);
  const aiGrowthSectionActive = isAIGrowthSectionActive(path);
  const reportSectionActive = isReportSectionActive(path);
  const [productsOpen, setProductsOpen] = useState(productSectionActive);
  const [analyticsOpen, setAnalyticsOpen] = useState(analyticsSectionActive);
  const [aiGrowthOpen, setAiGrowthOpen] = useState(aiGrowthSectionActive);
  const [reportsOpen, setReportsOpen] = useState(reportSectionActive);

  useEffect(() => {
    if (productSectionActive) {
      setProductsOpen(true);
    }
  }, [productSectionActive]);

  useEffect(() => {
    if (analyticsSectionActive) {
      setAnalyticsOpen(true);
    }
  }, [analyticsSectionActive]);

  useEffect(() => {
    if (aiGrowthSectionActive) {
      setAiGrowthOpen(true);
    }
  }, [aiGrowthSectionActive]);

  useEffect(() => {
    if (reportSectionActive) {
      setReportsOpen(true);
    }
  }, [reportSectionActive]);

  const linkClass = (active: boolean) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
      active ? "bg-primary text-white" : "text-foreground/70 hover:bg-blush"
    }`;

  const childLinkClass = (active: boolean) =>
    `flex items-center gap-2 rounded-lg py-1.5 pl-9 pr-3 text-sm ${
      active ? "bg-primary text-white font-medium" : "text-foreground/70 hover:bg-blush"
    }`;

  const nestedChildLinkClass = (active: boolean) =>
    `flex items-center gap-2 rounded-lg py-1.5 pl-14 pr-3 text-sm ${
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
              const Icon = child.icon;
              return (
                <Link key={child.href} href={child.href} className={childLinkClass(active)}>
                  <Icon className="h-4 w-4 shrink-0" />
                  {child.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <button
          type="button"
          onClick={() => setAnalyticsOpen((open) => !open)}
          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm ${
            analyticsSectionActive ? "bg-primary text-white" : "text-foreground/70 hover:bg-blush"
          }`}
          aria-expanded={analyticsOpen}
        >
          <ChartColumnBig className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">Analytics</span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition-transform ${analyticsOpen ? "rotate-180" : ""}`}
          />
        </button>

        {analyticsOpen && (
          <div className="mt-1 space-y-0.5">
            {ANALYTICS_CHILDREN.map((child) => {
              const active = child.isActive(path);
              const Icon = child.icon;
              return (
                <Link key={child.href} href={child.href} className={childLinkClass(active)}>
                  <Icon className="h-4 w-4 shrink-0" />
                  {child.label}
                </Link>
              );
            })}

            <div>
              <button
                type="button"
                onClick={() => setAiGrowthOpen((open) => !open)}
                className={`flex w-full items-center gap-2 rounded-lg py-1.5 pl-9 pr-3 text-sm ${
                  aiGrowthSectionActive
                    ? "bg-primary text-white font-medium"
                    : "text-foreground/70 hover:bg-blush"
                }`}
                aria-expanded={aiGrowthOpen}
              >
                <BrainCircuit className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">AI Growth Intelligence</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 shrink-0 transition-transform ${aiGrowthOpen ? "rotate-180" : ""}`}
                />
              </button>

              {aiGrowthOpen && (
                <div className="mt-0.5 space-y-0.5">
                  {AI_GROWTH_CHILDREN.map((child) => {
                    const active = child.isActive(path);
                    const Icon = child.icon;
                    return (
                      <Link key={child.href} href={child.href} className={nestedChildLinkClass(active)}>
                        <Icon className="h-4 w-4 shrink-0" />
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Link href="/admin/orders" className={linkClass(path.startsWith("/admin/orders"))}>
        <ShoppingCart className="h-4 w-4" />
        Orders
      </Link>

      <div>
        <button
          type="button"
          onClick={() => setReportsOpen((open) => !open)}
          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm ${
            reportSectionActive ? "bg-primary text-white" : "text-foreground/70 hover:bg-blush"
          }`}
          aria-expanded={reportsOpen}
        >
          <BarChart3 className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">Reports</span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition-transform ${reportsOpen ? "rotate-180" : ""}`}
          />
        </button>

        {reportsOpen && (
          <div className="mt-1 space-y-0.5">
            {REPORT_CHILDREN.map((child) => {
              const active = child.isActive(path);
              const Icon = child.icon;
              return (
                <Link key={child.href} href={child.href} className={childLinkClass(active)}>
                  <Icon className="h-4 w-4 shrink-0" />
                  {child.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <Link href="/admin/settings" className={linkClass(path.startsWith("/admin/settings"))}>
        <Settings className="h-4 w-4" />
        Settings
      </Link>
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
