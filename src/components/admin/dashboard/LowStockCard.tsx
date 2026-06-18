import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { DashboardLowStockItem } from "@/lib/admin/dashboard";
import { EmptyState } from "./EmptyState";

const STATUS_LABELS: Record<DashboardLowStockItem["status"], string> = {
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock"
};

const STATUS_COLORS: Record<DashboardLowStockItem["status"], string> = {
  low_stock: "bg-amber-100 text-amber-800",
  out_of_stock: "bg-red-100 text-red-800"
};

export function LowStockCard({ items }: { items: DashboardLowStockItem[] }) {
  return (
    <div className="rounded-2xl border border-accent/20 bg-white p-6 shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-primary">Low Stock Alert</h2>
          <p className="text-xs text-foreground/50">Products below inventory threshold</p>
        </div>
        <Link href="/admin/inventory" className="text-xs font-medium text-primary hover:underline">
          Manage
        </Link>
      </div>

      <div className="mt-4">
        {items.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title="All products well stocked"
            description="No products are currently below the low stock threshold."
          />
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={item.productId}
                className="flex items-center justify-between rounded-lg border border-accent/10 px-3 py-2.5 text-sm"
              >
                <span className="truncate font-medium text-foreground/90">{item.productName}</span>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-foreground/60">{item.currentStock} left</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COLORS[item.status]}`}
                  >
                    {STATUS_LABELS[item.status]}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
