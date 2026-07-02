import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Heart, MapPin, Package, Ruler } from "lucide-react";

type StatCard = {
  href: string;
  icon: LucideIcon;
  count: number | string;
  label: string;
};

type DashboardQuickStatsProps = {
  ordersCount: number;
  wishlistCount: number;
  addressesCount: number;
  measurementsComplete: boolean;
};

export function DashboardQuickStats({
  ordersCount,
  wishlistCount,
  addressesCount,
  measurementsComplete
}: DashboardQuickStatsProps) {
  const stats: StatCard[] = [
    { href: "/account/orders", icon: Package, count: ordersCount, label: "Orders" },
    { href: "/wishlist", icon: Heart, count: wishlistCount, label: "Wishlist" },
    { href: "/account/addresses", icon: MapPin, count: addressesCount, label: "Saved Addresses" },
    {
      href: "/account/measurements",
      icon: Ruler,
      count: measurementsComplete ? "✓" : "—",
      label: "Measurements"
    }
  ];

  return (
    <section aria-labelledby="dashboard-stats-heading">
      <h2 id="dashboard-stats-heading" className="sr-only">
        Account overview
      </h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="group flex h-full min-h-[120px] flex-col rounded-[16px] border border-[#F3E5E8] bg-white p-4 shadow-[0_2px_12px_rgba(122,13,43,0.04)] transition duration-200 hover:border-primary/15 hover:shadow-[0_6px_18px_rgba(122,13,43,0.07)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF0F3] text-primary transition group-hover:bg-primary group-hover:text-white">
                <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              </div>
              <p className="mt-auto pt-4 font-display text-2xl font-bold text-primary">{stat.count}</p>
              <p className="mt-0.5 text-sm font-medium text-foreground/70">{stat.label}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
