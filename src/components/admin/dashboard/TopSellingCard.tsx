import { TrendingUp } from "lucide-react";
import type { DashboardTopProduct } from "@/lib/admin/dashboard";
import { EmptyState } from "./EmptyState";

export function TopSellingCard({ products }: { products: DashboardTopProduct[] }) {
  return (
    <div className="rounded-2xl border border-accent/20 bg-white p-6 shadow-card">
      <div>
        <h2 className="font-semibold text-primary">Top Selling Products</h2>
        <p className="text-xs text-foreground/50">Based on order item quantities</p>
      </div>

      <div className="mt-4">
        {products.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No sales data yet"
            description="Top products will appear once orders include line items."
          />
        ) : (
          <ul className="space-y-3">
            {products.map((product, index) => (
              <li
                key={product.productId}
                className="flex items-center gap-3 rounded-lg border border-accent/10 bg-blush/10 px-3 py-2.5"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{product.name}</p>
                  <p className="text-xs text-foreground/50">
                    {product.quantitySold} sold · ₹{product.revenue.toLocaleString("en-IN")}{" "}
                    revenue
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
