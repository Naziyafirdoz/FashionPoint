"use client";

import Link from "next/link";
import { formatCurrency } from "@/lib/orders/admin-orders";
import { formatRefundDate } from "@/lib/orders/refunds";
import type { RefundQueueItem } from "@/lib/orders/refund-queue";

type RefundsTabViewProps = {
  items: RefundQueueItem[];
  dueToday: number;
  overdue: number;
  upcoming: number;
  selectedIds: Set<string>;
  onToggleSelect: (orderId: string) => void;
  onMarkRefunded: (orderId: string) => void;
  onBulkRefunded: () => void;
  bulkLoading?: boolean;
};

function exportRefundsCsv(items: RefundQueueItem[]) {
  const header = ["Order", "Customer", "Amount", "Initiated", "Expected", "Status"];
  const rows = items.map((i) => [
    i.order.order_number,
    i.customerName,
    String(i.refundAmount),
    i.refundInitiated ?? "",
    i.expectedRefundDate ?? "",
    i.isOverdue ? "Overdue" : i.isDueToday ? "Due Today" : "Upcoming"
  ]);
  const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `refund-queue-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function RefundSection({
  title,
  accent,
  sectionItems,
  selectedIds,
  onToggleSelect,
  onMarkRefunded
}: {
  title: string;
  accent: string;
  sectionItems: RefundQueueItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onMarkRefunded: (id: string) => void;
}) {
  if (sectionItems.length === 0) return null;
  return (
    <div className="mt-6">
      <h3 className={`text-xs font-semibold uppercase tracking-wide ${accent}`}>{title}</h3>
      <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="w-10 px-3 py-2" />
              <th className="px-3 py-2">Order</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Expected</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sectionItems.map((item) => (
              <tr key={item.order.id} className={item.isOverdue ? "bg-red-50/50" : ""}>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.order.id)}
                    onChange={() => onToggleSelect(item.order.id)}
                    aria-label={`Select ${item.order.order_number}`}
                  />
                </td>
                <td className="px-3 py-2 font-medium text-primary">
                  <Link href={`/admin/orders/${item.order.id}`} className="hover:underline">
                    {item.order.order_number}
                  </Link>
                </td>
                <td className="px-3 py-2 text-gray-700">{item.customerName}</td>
                <td className="px-3 py-2 font-semibold tabular-nums">
                  {formatCurrency(item.refundAmount)}
                </td>
                <td className="px-3 py-2 text-gray-600">
                  {item.expectedRefundDate ? formatRefundDate(item.expectedRefundDate) : "—"}
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    className="rounded-xl bg-primary px-3 py-1 text-xs font-semibold text-white hover:bg-primary/90"
                    onClick={() => onMarkRefunded(item.order.id)}
                  >
                    Mark Refunded
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function RefundsTabView({
  items,
  dueToday,
  overdue,
  upcoming,
  selectedIds,
  onToggleSelect,
  onMarkRefunded,
  onBulkRefunded,
  bulkLoading = false
}: RefundsTabViewProps) {
  const dueTodayItems = items.filter((i) => i.isDueToday);
  const overdueItems = items.filter((i) => i.isOverdue);
  const upcomingItems = items.filter((i) => !i.isDueToday && !i.isOverdue);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Refund Queue</h2>
          <p className="mt-1 text-sm text-gray-500">
            Refunds are usually credited within 4–5 business days.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
            onClick={() => exportRefundsCsv(items)}
            disabled={items.length === 0}
          >
            Export
          </button>
          {selectedIds.size > 0 ? (
            <button
              type="button"
              className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
              disabled={bulkLoading}
              onClick={onBulkRefunded}
            >
              {bulkLoading ? "Processing…" : `Mark Refunded (${selectedIds.size})`}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-amber-900 tabular-nums">{dueToday}</p>
          <p className="text-xs font-medium text-amber-800">Due Today</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-red-900 tabular-nums">{overdue}</p>
          <p className="text-xs font-medium text-red-800">Overdue</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{upcoming}</p>
          <p className="text-xs font-medium text-gray-600">Upcoming</p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="mt-8 text-center text-sm text-gray-500">No refunds pending.</p>
      ) : (
        <>
          <RefundSection
            title="Overdue Refunds"
            accent="text-red-700"
            sectionItems={overdueItems}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            onMarkRefunded={onMarkRefunded}
          />
          <RefundSection
            title="Due Today"
            accent="text-amber-700"
            sectionItems={dueTodayItems}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            onMarkRefunded={onMarkRefunded}
          />
          <RefundSection
            title="Upcoming Refunds"
            accent="text-gray-600"
            sectionItems={upcomingItems}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            onMarkRefunded={onMarkRefunded}
          />
        </>
      )}
    </section>
  );
}
