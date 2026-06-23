"use client";

import Link from "next/link";
import {
  BarChart3,
  Boxes,
  CircleDollarSign,
  Package,
  ShoppingBag,
  Star,
  type LucideIcon
} from "lucide-react";

type NavCard = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

const NAV_CARDS: NavCard[] = [
  {
    href: "/admin/analytics/sales",
    label: "Sales Analytics",
    description: "Revenue, orders, AOV trends and sales highlights",
    icon: CircleDollarSign
  },
  {
    href: "/admin/analytics/orders",
    label: "Order Analytics",
    description: "Pipeline, completion rates, and fulfillment timing",
    icon: ShoppingBag
  },
  {
    href: "/admin/analytics/products",
    label: "Product Analytics",
    description: "Top sellers, categories, and slow-moving products",
    icon: Package
  },
  {
    href: "/admin/analytics/reviews",
    label: "Review Analytics",
    description: "Customer review insights and ratings",
    icon: Star
  },
  {
    href: "/admin/analytics/inventory",
    label: "Inventory Analytics",
    description: "Stock levels and inventory health",
    icon: Boxes
  }
];

export function AnalyticsNavCards() {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/50">
        Explore Analytics
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {NAV_CARDS.map(({ href, label, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col rounded-xl border border-accent/20 bg-white p-4 shadow-card transition hover:border-primary/30 hover:shadow-md"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <p className="mt-3 text-sm font-semibold text-foreground">{label}</p>
            <p className="mt-1 text-xs text-foreground/55">{description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function AnalyticsOverviewHeader() {
  return (
    <div className="flex items-center gap-2">
      <BarChart3 className="h-5 w-5 text-primary" aria-hidden />
      <div>
        <h2 className="font-display text-lg font-bold text-primary">Overview</h2>
        <p className="text-xs text-foreground/55">Store performance at a glance</p>
      </div>
    </div>
  );
}
