import {
  AlertTriangle,
  IndianRupee,
  Package,
  ShoppingBag,
  Star,
  Users,
  type LucideIcon
} from "lucide-react";
import type { DashboardKpis } from "@/lib/admin/dashboard";

const KPI_CONFIG: {
  key: keyof DashboardKpis;
  label: string;
  icon: LucideIcon;
  format: (v: number) => string;
  accent: string;
}[] = [
  {
    key: "totalRevenue",
    label: "Total Revenue",
    icon: IndianRupee,
    format: (v) => `₹${v.toLocaleString("en-IN")}`,
    accent: "bg-emerald-50 text-emerald-700"
  },
  {
    key: "totalOrders",
    label: "Total Orders",
    icon: ShoppingBag,
    format: (v) => v.toLocaleString("en-IN"),
    accent: "bg-blue-50 text-blue-700"
  },
  {
    key: "totalCustomers",
    label: "Total Customers",
    icon: Users,
    format: (v) => v.toLocaleString("en-IN"),
    accent: "bg-violet-50 text-violet-700"
  },
  {
    key: "totalProducts",
    label: "Total Products",
    icon: Package,
    format: (v) => v.toLocaleString("en-IN"),
    accent: "bg-amber-50 text-amber-700"
  },
  {
    key: "lowStockProducts",
    label: "Low Stock Products",
    icon: AlertTriangle,
    format: (v) => v.toLocaleString("en-IN"),
    accent: "bg-orange-50 text-orange-700"
  },
  {
    key: "totalReviews",
    label: "Total Reviews",
    icon: Star,
    format: (v) => v.toLocaleString("en-IN"),
    accent: "bg-pink-50 text-pink-700"
  }
];

export function DashboardKpiGrid({ kpis }: { kpis: DashboardKpis }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {KPI_CONFIG.map(({ key, label, icon: Icon, format, accent }) => (
        <div
          key={key}
          className="group rounded-xl border border-accent/20 bg-white p-4 shadow-card transition hover:border-primary/20 hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium text-foreground/60">{label}</p>
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${accent}`}>
              <Icon className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-primary">{format(kpis[key])}</p>
        </div>
      ))}
    </div>
  );
}
