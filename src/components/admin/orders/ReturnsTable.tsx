"use client";

import Link from "next/link";
import { formatOrderDate, type OrderListRow } from "@/lib/orders/admin-orders";
import { returnReasonLabel, returnStatusLabel } from "@/lib/orders/returns";
import type { ReturnRequest } from "@/types";

type ReturnsTableProps = {
  returnRequests: ReturnRequest[];
  ordersById: Map<string, OrderListRow>;
};

export function ReturnsTable({ returnRequests, ordersById }: ReturnsTableProps) {
  if (returnRequests.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center">
        <p className="text-sm font-medium text-gray-900">No return requests</p>
        <p className="mt-1 text-sm text-gray-500">Customer return requests will appear here.</p>
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm md:block">
        <table className="w-full text-sm">
          <thead className="sticky top-0 border-b border-gray-200 bg-gray-50">
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Requested On</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {returnRequests.map((rr) => {
              const order = ordersById.get(rr.order_id);
              const customer = order?.shipping_address?.name ?? "—";
              return (
                <tr key={rr.id} className="hover:bg-gray-50/80">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${rr.order_id}`}
                      className="font-semibold text-primary hover:underline"
                    >
                      {order?.order_number ?? rr.order_id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{returnReasonLabel(rr.reason)}</td>
                  <td className="px-4 py-3 text-gray-900">{customer}</td>
                  <td className="px-4 py-3 text-gray-600">{formatOrderDate(rr.created_at)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-800 ring-1 ring-inset ring-orange-200">
                      {returnStatusLabel(rr.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${rr.order_id}`}
                      className="rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90"
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:hidden">
        {returnRequests.map((rr) => {
          const order = ordersById.get(rr.order_id);
          return (
            <article key={rr.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/admin/orders/${rr.order_id}`} className="font-semibold text-primary">
                  {order?.order_number ?? "Order"}
                </Link>
                <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs text-orange-800">
                  {returnStatusLabel(rr.status)}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-700">{returnReasonLabel(rr.reason)}</p>
              <p className="mt-1 text-xs text-gray-500">Requested {formatOrderDate(rr.created_at)}</p>
              <Link
                href={`/admin/orders/${rr.order_id}`}
                className="mt-3 inline-block rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-white"
              >
                Review
              </Link>
            </article>
          );
        })}
      </div>
    </>
  );
}
