"use client";

import Link from "next/link";
import {
  CircleDollarSign,
  Lightbulb,
  Package,
  Target,
  Users,
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
    href: "/admin/ai-growth/customers",
    label: "Customer Intelligence",
    description: "Customer behavior and retention signals",
    icon: Users
  },
  {
    href: "/admin/ai-growth/revenue",
    label: "Revenue Intelligence",
    description: "Revenue opportunities and trends",
    icon: CircleDollarSign
  },
  {
    href: "/admin/ai-growth/products",
    label: "Product Intelligence",
    description: "Catalog performance and assortment gaps",
    icon: Package
  },
  {
    href: "/admin/ai-growth/conversion",
    label: "Conversion Intelligence",
    description: "Funnel friction and checkout insights",
    icon: Target
  },
  {
    href: "/admin/ai-growth/suggestions",
    label: "AI Suggestions",
    description: "Prioritized actions for store growth",
    icon: Lightbulb
  }
];

export function AIGrowthNavCards() {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/50">
        Quick Links
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
