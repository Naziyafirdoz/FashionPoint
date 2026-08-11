"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import {
  BarChart3,
  Bell,
  Boxes,
  BrainCircuit,
  ChartColumnBig,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FolderTree,
  LayoutDashboard,
  Lightbulb,
  ListTodo,
  Menu,
  MessageSquareMore,
  Package,
  PackagePlus,
  PackageSearch,
  Settings,
  ShoppingCart,
  Star,
  Stars,
  TrendingUp,
  Warehouse,
  X
} from "lucide-react";
import { useAdminSidebar } from "@/contexts/AdminSidebarContext";

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
    href: "/admin/sub-categories",
    label: "Sub Categories",
    icon: FolderTree,
    isActive: (path) => path.startsWith("/admin/sub-categories")
  },
  {
    href: "/admin/inventory",
    label: "Inventory",
    icon: Warehouse,
    isActive: (path) => path.startsWith("/admin/inventory")
  },
  {
    href: "/admin/products/back-in-stock-requests",
    label: "Back In Stock Requests",
    icon: Bell,
    isActive: (path) => path.startsWith("/admin/products/back-in-stock-requests")
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
  "/admin/sub-categories",
  "/admin/inventory",
  "/admin/reviews",
  "/admin/products/back-in-stock-requests"
];

const LINKS: NavLink[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/settings", label: "Settings", icon: Settings }
];

type FlyoutId = "products" | "analytics" | "reports";

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

function CollapsedFlyout({
  open,
  onClose,
  children,
  anchorRef
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  anchorRef: React.RefObject<HTMLElement | null>;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || anchorRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="absolute left-full top-0 z-50 ml-2 min-w-[13rem] rounded-lg border border-gray-200 bg-white p-2 shadow-lg"
    >
      {children}
    </div>
  );
}

type AdminSidebarNavProps = {
  collapsed: boolean;
  onNavigate: () => void;
};

function AdminSidebarNav({ collapsed, onNavigate }: AdminSidebarNavProps) {
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
  const [activeFlyout, setActiveFlyout] = useState<FlyoutId | null>(null);

  const productsRef = useRef<HTMLDivElement>(null);
  const analyticsRef = useRef<HTMLDivElement>(null);
  const reportsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (productSectionActive) setProductsOpen(true);
  }, [productSectionActive]);

  useEffect(() => {
    if (analyticsSectionActive) setAnalyticsOpen(true);
  }, [analyticsSectionActive]);

  useEffect(() => {
    if (aiGrowthSectionActive) setAiGrowthOpen(true);
  }, [aiGrowthSectionActive]);

  useEffect(() => {
    if (reportSectionActive) setReportsOpen(true);
  }, [reportSectionActive]);

  useEffect(() => {
    setActiveFlyout(null);
  }, [path, collapsed]);

  const linkClass = (active: boolean) =>
    `flex items-center rounded-lg py-2 text-sm ${
      collapsed ? "justify-center px-2" : "gap-2 px-3"
    } ${active ? "bg-primary text-white" : "text-foreground/70 hover:bg-blush"}`;

  const childLinkClass = (active: boolean) =>
    `flex items-center gap-2 rounded-lg py-1.5 pr-3 text-sm ${
      active ? "bg-primary text-white font-medium" : "text-foreground/70 hover:bg-blush"
    } ${collapsed ? "pl-2" : "pl-9"}`;

  const nestedChildLinkClass = (active: boolean) =>
    `flex items-center gap-2 rounded-lg py-1.5 pr-3 text-sm ${
      active ? "bg-primary text-white font-medium" : "text-foreground/70 hover:bg-blush"
    } ${collapsed ? "pl-2" : "pl-14"}`;

  const sectionButtonClass = (active: boolean) =>
    `flex w-full items-center rounded-lg py-2 text-sm ${
      collapsed ? "justify-center px-2" : "gap-2 px-3"
    } ${active ? "bg-primary text-white" : "text-foreground/70 hover:bg-blush"}`;

  const flyoutLinkClass = (active: boolean) =>
    `flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
      active ? "bg-primary text-white font-medium" : "text-foreground/70 hover:bg-blush"
    }`;

  const handleNavClick = () => {
    onNavigate();
    setActiveFlyout(null);
  };

  const toggleFlyout = (id: FlyoutId) => {
    setActiveFlyout((current) => (current === id ? null : id));
  };

  return (
    <nav className={`space-y-1 ${collapsed ? "mt-4" : "mt-6"}`}>
      <Link
        href="/admin/dashboard"
        className={linkClass(path.startsWith("/admin/dashboard"))}
        title={collapsed ? "Dashboard" : undefined}
        onClick={handleNavClick}
      >
        <LayoutDashboard className="h-4 w-4 shrink-0" />
        {!collapsed && "Dashboard"}
      </Link>

      <div className="relative" ref={productsRef}>
        <button
          type="button"
          onClick={() => {
            if (collapsed) {
              toggleFlyout("products");
              return;
            }
            setProductsOpen((open) => !open);
          }}
          className={sectionButtonClass(productSectionActive)}
          aria-expanded={collapsed ? activeFlyout === "products" : productsOpen}
          title={collapsed ? "Products" : undefined}
        >
          <Package className="h-4 w-4 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">Products</span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition-transform ${productsOpen ? "rotate-180" : ""}`}
              />
            </>
          )}
        </button>

        {collapsed ? (
          <CollapsedFlyout
            open={activeFlyout === "products"}
            onClose={() => setActiveFlyout(null)}
            anchorRef={productsRef}
          >
            <div className="space-y-0.5">
              {PRODUCT_CHILDREN.map((child) => {
                const active = child.isActive(path, featured);
                const Icon = child.icon;
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={flyoutLinkClass(active)}
                    onClick={handleNavClick}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {child.label}
                  </Link>
                );
              })}
            </div>
          </CollapsedFlyout>
        ) : (
          productsOpen && (
            <div className="mt-1 space-y-0.5">
              {PRODUCT_CHILDREN.map((child) => {
                const active = child.isActive(path, featured);
                const Icon = child.icon;
                return (
                  <Link key={child.href} href={child.href} className={childLinkClass(active)} onClick={handleNavClick}>
                    <Icon className="h-4 w-4 shrink-0" />
                    {child.label}
                  </Link>
                );
              })}
            </div>
          )
        )}
      </div>

      <div className="relative" ref={analyticsRef}>
        <button
          type="button"
          onClick={() => {
            if (collapsed) {
              toggleFlyout("analytics");
              return;
            }
            setAnalyticsOpen((open) => !open);
          }}
          className={sectionButtonClass(analyticsSectionActive)}
          aria-expanded={collapsed ? activeFlyout === "analytics" : analyticsOpen}
          title={collapsed ? "Analytics" : undefined}
        >
          <ChartColumnBig className="h-4 w-4 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">Analytics</span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition-transform ${analyticsOpen ? "rotate-180" : ""}`}
              />
            </>
          )}
        </button>

        {collapsed ? (
          <CollapsedFlyout
            open={activeFlyout === "analytics"}
            onClose={() => setActiveFlyout(null)}
            anchorRef={analyticsRef}
          >
            <div className="space-y-0.5">
              {ANALYTICS_CHILDREN.map((child) => {
                const active = child.isActive(path);
                const Icon = child.icon;
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={flyoutLinkClass(active)}
                    onClick={handleNavClick}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {child.label}
                  </Link>
                );
              })}
              <div className="my-1 border-t border-gray-100" />
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-foreground/45">
                AI Growth
              </p>
              {AI_GROWTH_CHILDREN.map((child) => {
                const active = child.isActive(path);
                const Icon = child.icon;
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={flyoutLinkClass(active)}
                    onClick={handleNavClick}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {child.label}
                  </Link>
                );
              })}
            </div>
          </CollapsedFlyout>
        ) : (
          analyticsOpen && (
            <div className="mt-1 space-y-0.5">
              {ANALYTICS_CHILDREN.map((child) => {
                const active = child.isActive(path);
                const Icon = child.icon;
                return (
                  <Link key={child.href} href={child.href} className={childLinkClass(active)} onClick={handleNavClick}>
                    <Icon className="h-4 w-4 shrink-0" />
                    {child.label}
                  </Link>
                );
              })}

              <div>
                <button
                  type="button"
                  onClick={() => setAiGrowthOpen((open) => !open)}
                  className={`flex w-full items-center gap-2 rounded-lg py-1.5 pr-3 text-sm ${
                    aiGrowthSectionActive
                      ? "bg-primary text-white font-medium"
                      : "text-foreground/70 hover:bg-blush"
                  } pl-9`}
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
                        <Link
                          key={child.href}
                          href={child.href}
                          className={nestedChildLinkClass(active)}
                          onClick={handleNavClick}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </div>

      <Link
        href="/admin/orders"
        className={linkClass(path.startsWith("/admin/orders"))}
        title={collapsed ? "Orders" : undefined}
        onClick={handleNavClick}
      >
        <ShoppingCart className="h-4 w-4 shrink-0" />
        {!collapsed && "Orders"}
      </Link>

      <div className="relative" ref={reportsRef}>
        <button
          type="button"
          onClick={() => {
            if (collapsed) {
              toggleFlyout("reports");
              return;
            }
            setReportsOpen((open) => !open);
          }}
          className={sectionButtonClass(reportSectionActive)}
          aria-expanded={collapsed ? activeFlyout === "reports" : reportsOpen}
          title={collapsed ? "Reports" : undefined}
        >
          <BarChart3 className="h-4 w-4 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">Reports</span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition-transform ${reportsOpen ? "rotate-180" : ""}`}
              />
            </>
          )}
        </button>

        {collapsed ? (
          <CollapsedFlyout
            open={activeFlyout === "reports"}
            onClose={() => setActiveFlyout(null)}
            anchorRef={reportsRef}
          >
            <div className="space-y-0.5">
              {REPORT_CHILDREN.map((child) => {
                const active = child.isActive(path);
                const Icon = child.icon;
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={flyoutLinkClass(active)}
                    onClick={handleNavClick}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {child.label}
                  </Link>
                );
              })}
            </div>
          </CollapsedFlyout>
        ) : (
          reportsOpen && (
            <div className="mt-1 space-y-0.5">
              {REPORT_CHILDREN.map((child) => {
                const active = child.isActive(path);
                const Icon = child.icon;
                return (
                  <Link key={child.href} href={child.href} className={childLinkClass(active)} onClick={handleNavClick}>
                    <Icon className="h-4 w-4 shrink-0" />
                    {child.label}
                  </Link>
                );
              })}
            </div>
          )
        )}
      </div>

      <Link
        href="/admin/settings"
        className={linkClass(path.startsWith("/admin/settings"))}
        title={collapsed ? "Settings" : undefined}
        onClick={handleNavClick}
      >
        <Settings className="h-4 w-4 shrink-0" />
        {!collapsed && "Settings"}
      </Link>
    </nav>
  );
}

function AdminSidebarFallback({ collapsed }: { collapsed: boolean }) {
  return (
    <nav className={`space-y-1 ${collapsed ? "mt-4" : "mt-6"}`}>
      {LINKS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={`flex items-center rounded-lg py-2 text-sm text-foreground/70 hover:bg-blush ${
            collapsed ? "justify-center px-2" : "gap-2 px-3"
          }`}
          title={collapsed ? label : undefined}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {!collapsed && label}
        </Link>
      ))}
    </nav>
  );
}

function SidebarToggleButton({
  collapsed,
  mobileOpen,
  onToggle
}: {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-foreground/60 transition hover:bg-blush hover:text-primary"
      aria-label={
        mobileOpen ? "Close admin menu" : collapsed ? "Expand sidebar" : "Collapse sidebar"
      }
    >
      {mobileOpen ? (
        <X className="h-5 w-5 lg:hidden" />
      ) : collapsed ? (
        <ChevronRight className="h-5 w-5" />
      ) : (
        <ChevronLeft className="h-5 w-5" />
      )}
    </button>
  );
}

export function AdminMobileMenuButton() {
  const { mobileOpen, openMobile } = useAdminSidebar();

  if (mobileOpen) return null;

  return (
    <button
      type="button"
      onClick={openMobile}
      className="fixed left-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-foreground/70 shadow-sm transition hover:bg-blush hover:text-primary lg:hidden"
      aria-label="Open admin menu"
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}

export function AdminSidebar() {
  const { collapsed, mobileOpen, toggleCollapsed, closeMobile } = useAdminSidebar();
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const iconOnly = collapsed && isDesktop;
  const sidebarWidth = iconOnly ? "w-16" : "w-56";

  const handleToggle = () => {
    if (!isDesktop) {
      closeMobile();
      return;
    }
    toggleCollapsed();
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex h-screen shrink-0 flex-col overflow-visible border-r bg-white transition-[transform,width] duration-300 ease-in-out lg:sticky lg:top-0 lg:z-auto ${sidebarWidth} ${
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}
      aria-label="Admin navigation"
    >
      <div
        className={`shrink-0 border-b ${
          iconOnly
            ? "flex flex-col items-center gap-1 px-2 py-3"
            : "flex items-center justify-between gap-2 px-4 py-4"
        }`}
      >
        {!iconOnly ? (
          <Link href="/admin/dashboard" className="truncate font-display text-lg font-bold text-primary">
            Admin
          </Link>
        ) : (
          <Link
            href="/admin/dashboard"
            className="font-display text-base font-bold text-primary"
            title="Admin"
            aria-label="Admin dashboard"
          >
            A
          </Link>
        )}
        <SidebarToggleButton collapsed={iconOnly} mobileOpen={mobileOpen} onToggle={handleToggle} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-4 pt-2 lg:overflow-x-visible lg:px-4">
        <Suspense fallback={<AdminSidebarFallback collapsed={iconOnly} />}>
          <AdminSidebarNav collapsed={iconOnly} onNavigate={closeMobile} />
        </Suspense>
      </div>
    </aside>
  );
}
