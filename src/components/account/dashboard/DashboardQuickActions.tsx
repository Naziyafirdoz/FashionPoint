import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Heart, MapPin, Package, Ruler, Sparkles, UserRound } from "lucide-react";

type ActionCard = {
  href: string;
  icon: LucideIcon;
  title: string;
};

const ACTIONS: ActionCard[] = [
  { href: "/account/orders", icon: Package, title: "My Orders" },
  { href: "/wishlist", icon: Heart, title: "Wishlist" },
  { href: "/account/profile", icon: UserRound, title: "Edit Profile" },
  { href: "/account/addresses", icon: MapPin, title: "Saved Addresses" },
  { href: "/account/measurements", icon: Ruler, title: "Measurements" },
  { href: "/account/ai-history", icon: Sparkles, title: "AI History" }
];

export function DashboardQuickActions() {
  return (
    <section aria-labelledby="dashboard-actions-heading">
      <h2 id="dashboard-actions-heading" className="mb-3 font-display text-lg font-bold text-primary">
        Quick Actions
      </h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="group flex h-full min-h-[72px] items-center justify-between rounded-[16px] border border-[#F3E5E8] bg-white px-4 py-4 shadow-[0_2px_10px_rgba(122,13,43,0.03)] transition duration-200 hover:border-primary/15 hover:bg-[#FFFBFC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF0F3] text-primary transition group-hover:bg-primary group-hover:text-white">
                  <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <span className="text-sm font-semibold text-[#2A2A2A]">{action.title}</span>
              </span>
              <ArrowRight
                className="h-4 w-4 shrink-0 text-foreground/25 transition group-hover:translate-x-0.5 group-hover:text-primary"
                aria-hidden="true"
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
