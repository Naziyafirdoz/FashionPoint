import Link from "next/link";
import type { AdminOrderQueueRow } from "@/lib/admin/use-admin-order-queues";
import { EmptyState } from "./EmptyState";
import { ClipboardList } from "lucide-react";

type PendingApprovalWidgetProps = {
  orders: AdminOrderQueueRow[];
  loading?: boolean;
};

export function PendingApprovalWidget({ orders, loading }: PendingApprovalWidgetProps) {
  return (
    <div className="rounded-2xl border border-accent/20 bg-white p-6 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-primary">Pending Approval</h2>
          <p className="text-xs text-foreground/50">Processing orders awaiting your review</p>
        </div>
        <Link href="/admin/orders?tab=processing" className="text-xs font-medium text-primary hover:underline">
          View all
        </Link>
      </div>

      <div className="mt-4">
        {loading ? (
          <p className="py-8 text-center text-sm text-foreground/50">Loading pending orders…</p>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No pending approvals"
            description="New orders waiting for approval will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-foreground/50">
                  <th className="pb-2 font-medium">Order ID</th>
                  <th className="pb-2 font-medium">Customer</th>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Payment Status</th>
                  <th className="pb-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-accent/10 transition hover:bg-blush/30 last:border-0">
                    <td className="py-3 font-medium text-primary">{order.orderNumber}</td>
                    <td className="py-3 text-foreground/80">{order.customer}</td>
                    <td className="py-3 text-foreground/60">
                      {new Date(order.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                      })}
                    </td>
                    <td className="py-3 font-medium">₹{order.amount.toLocaleString("en-IN")}</td>
                    <td className="py-3">
                      <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium capitalize text-emerald-800">
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex rounded-full border border-red-200 bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                          Pending Approval
                        </span>
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          Review
                        </Link>
                      </div>
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
