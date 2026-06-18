"use client";

import Link from "next/link";
import { formatRefundDate } from "@/lib/orders/refunds";
import type { RefundQueueItem } from "@/lib/orders/refund-queue";
import { formatCurrency } from "@/lib/orders/admin-orders";

type RefundQueuePanelProps = {
  open: boolean;
  items: RefundQueueItem[];
  selectedIds: Set<string>;
  onToggleSelect: (orderId: string) => void;
  onMarkRefunded: (orderId: string) => void;
  onBulkRefunded: () => void;
  onClose: () => void;
  bulkLoading?: boolean;
};

export function RefundQueuePanel({
  open,
  items,
  selectedIds,
  onToggleSelect,
  onMarkRefunded,
  onBulkRefunded,
  onClose,
  bulkLoading = false
}: RefundQueuePanelProps) {
  if (!open) return null;

  const dueToday = items.filter((i) => i.isDueToday);
  const overdue = items.filter((i) => i.isOverdue);
  const upcoming = items.filter((i) => !i.isDueToday && !i.isOverdue);

  const renderSection = (title: string, sectionItems: RefundQueueItem[], accent?: string) => {
    if (sectionItems.length === 0) return null;
    return (
      <div className="mt-4">
        <h3 className={`text-xs font-semibold uppercase tracking-wide ${accent ?? "text-foreground/60"}`}>
          {title}
        </h3>
        <ul className="mt-2 space-y-3">
          {sectionItems.map((item) => (
            <li
              key={item.order.id}
              className={`rounded-lg border p-3 text-sm ${
                item.isOverdue ? "border-red-200 bg-red-50" : "border-accent/20 bg-white"
              }`}
            >
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selectedIds.has(item.order.id)}
                  onChange={() => onToggleSelect(item.order.id)}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-primary">{item.order.order_number}</p>
                  <p className="text-foreground/70">{item.customerName}</p>
                  <p className="mt-1 font-semibold">{formatCurrency(item.refundAmount)}</p>
                  <p className="text-xs text-foreground/50">
                    Initiated: {item.refundInitiated ? formatRefundDate(item.refundInitiated) : "—"}
                  </p>
                  <p className={`text-xs ${item.isOverdue ? "font-medium text-red-700" : "text-foreground/50"}`}>
                    Expected: {item.expectedRefundDate ? formatRefundDate(item.expectedRefundDate) : "—"}
                    {item.isOverdue ? " · Overdue" : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Link
                      href={`/admin/orders/${item.order.id}`}
                      className="text-xs text-primary underline"
                    >
                      View Order
                    </Link>
                    <button
                      type="button"
                      className="text-xs text-orange-800 underline"
                      onClick={() => onMarkRefunded(item.order.id)}
                    >
                      Mark Refunded
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30">
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="font-bold text-primary">Refund Queue</h2>
          <button type="button" className="text-sm text-foreground/60" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <p className="text-sm text-foreground/60">No refunds pending.</p>
          ) : (
            <>
              {renderSection("Overdue", overdue, "text-red-700")}
              {renderSection("Due Today", dueToday, "text-amber-700")}
              {renderSection("Upcoming", upcoming)}
            </>
          )}
        </div>
        {selectedIds.size > 0 ? (
          <div className="border-t p-4">
            <button
              type="button"
              className="btn-primary w-full"
              disabled={bulkLoading}
              onClick={onBulkRefunded}
            >
              {bulkLoading ? "Processing…" : `Bulk Mark Refunded (${selectedIds.size})`}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
