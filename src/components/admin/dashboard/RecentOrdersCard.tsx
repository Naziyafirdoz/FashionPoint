import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import type { DashboardRecentOrder } from "@/lib/admin/dashboard";
import { EmptyState } from "./EmptyState";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  processing: "bg-orange-100 text-orange-800",
  shipped: "bg-blue-100 text-blue-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  returned: "bg-orange-100 text-orange-800"
};

export function RecentOrdersCard({ orders }: { orders: DashboardRecentOrder[] }) {
  return (
    <div className="rounded-2xl border border-accent/20 bg-white p-6 shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-primary">Recent Orders</h2>
          <p className="text-xs text-foreground/50">Latest 10 orders</p>
        </div>
        <Link href="/admin/orders" className="text-xs font-medium text-primary hover:underline">
          View all
        </Link>
      </div>

      <div className="mt-4">
        {orders.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="No orders yet"
            description="Orders will appear here after customers complete checkout."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-foreground/50">
                  <th className="pb-2 font-medium">Order ID</th>
                  <th className="pb-2 font-medium">Customer</th>
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-accent/10 last:border-0">
                    <td className="py-3 font-medium text-primary">{order.orderNumber}</td>
                    <td className="py-3 text-foreground/80">{order.customer}</td>
                    <td className="py-3">₹{order.amount.toLocaleString("en-IN")}</td>
                    <td className="py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs capitalize ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-700"}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 text-foreground/60">
                      {new Date(order.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
