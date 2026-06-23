import Link from "next/link";
import { CheckCircle2, ClipboardList, Package, PackageCheck, Truck } from "lucide-react";

const ACTIONS = [
  { href: "/admin/orders?tab=processing", label: "View Pending Orders", icon: ClipboardList },
  { href: "/admin/orders?tab=confirmed", label: "View Confirmed Orders", icon: CheckCircle2 },
  { href: "/admin/orders?tab=packing_assigned", label: "View Packing Orders", icon: Package },
  { href: "/admin/orders?tab=ready_to_ship", label: "View Ready To Ship", icon: PackageCheck },
  { href: "/admin/orders?tab=shipped", label: "View Shipped Orders", icon: Truck }
] as const;

export function OrderWorkflowQuickActions() {
  return (
    <div className="rounded-2xl border border-accent/20 bg-white p-5 shadow-card">
      <h2 className="font-semibold text-primary">Quick Actions</h2>
      <p className="mt-1 text-xs text-foreground/50">Jump to order queues by status</p>
      <div className="mt-4 flex flex-wrap gap-3">
        {ACTIONS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-white px-4 py-2.5 text-sm font-semibold text-primary transition hover:border-primary/30 hover:bg-blush/40"
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
