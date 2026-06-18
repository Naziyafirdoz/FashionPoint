import Link from "next/link";
import { FolderPlus, PackagePlus, ShoppingCart, Ticket } from "lucide-react";

const ACTIONS = [
  { href: "/admin/products/new", label: "Add Product", icon: PackagePlus, primary: true },
  { href: "/admin/categories", label: "Add Category", icon: FolderPlus, primary: false },
  { href: "/admin/marketing", label: "Create Coupon", icon: Ticket, primary: false },
  { href: "/admin/orders", label: "View Orders", icon: ShoppingCart, primary: false }
] as const;

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-3">
      {ACTIONS.map(({ href, label, icon: Icon, primary }) => (
        <Link
          key={href}
          href={href}
          className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
            primary ? "btn-primary" : "btn-outline"
          }`}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Link>
      ))}
    </div>
  );
}
