"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { OrderPrimaryAction } from "@/lib/orders/admin-order-ui";
import type { OrderListRow } from "@/lib/orders/admin-orders";

type OrderRowActionsProps = {
  order: OrderListRow;
  primaryAction: OrderPrimaryAction;
  busy: boolean;
  onStartProcessing?: (order: OrderListRow) => void;
  onApproveOrder?: (order: OrderListRow) => void;
  onReadyForShipping?: (order: OrderListRow) => void;
  onMarkShipped?: (order: OrderListRow) => void;
  onMarkDelivered?: (order: OrderListRow) => void;
  onProcessRefund?: (orderId: string) => void;
  onPrint: (order: OrderListRow) => void;
  onDownloadInvoice?: (order: OrderListRow) => void;
};

export function OrderRowActions({
  order,
  primaryAction,
  busy,
  onStartProcessing,
  onApproveOrder,
  onReadyForShipping,
  onMarkShipped,
  onMarkDelivered,
  onProcessRefund,
  onPrint,
  onDownloadInvoice
}: OrderRowActionsProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const runPrimary = () => {
    switch (primaryAction.type) {
      case "start_processing":
        onStartProcessing?.(order);
        break;
      case "approve_order":
        onApproveOrder?.(order);
        break;
      case "ready_for_shipping":
        onReadyForShipping?.(order);
        break;
      case "mark_shipped":
        onMarkShipped?.(order);
        break;
      case "mark_delivered":
        onMarkDelivered?.(order);
        break;
      case "process_refund":
        onProcessRefund?.(order.id);
        break;
      default:
        break;
    }
  };

  const showPrimary = primaryAction.type !== "view";

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      {showPrimary ? (
        <button
          type="button"
          disabled={busy}
          onClick={runPrimary}
          className="max-w-full truncate rounded-xl bg-primary px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 sm:px-3"
        >
          {busy ? "…" : primaryAction.label}
        </button>
      ) : (
        <Link
          href={`/admin/orders/${order.id}`}
          className="rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-primary/90"
        >
          View
        </Link>
      )}
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label="More actions"
          disabled={busy}
          onClick={() => setOpen((v) => !v)}
          className="rounded-xl border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          ⋮
        </button>
        {open ? (
          <div
            role="menu"
            className="absolute right-0 z-10 mt-1 min-w-[11rem] rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
          >
            <Link
              role="menuitem"
              href={`/admin/orders/${order.id}`}
              className="block px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
              onClick={() => setOpen(false)}
            >
              View Order
            </Link>
            <Link
              role="menuitem"
              href={`/admin/orders/${order.id}#timeline`}
              className="block px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
              onClick={() => setOpen(false)}
            >
              View Timeline
            </Link>
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
              onClick={() => {
                onPrint(order);
                setOpen(false);
              }}
            >
              Print Invoice
            </button>
            {onDownloadInvoice ? (
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
                onClick={() => {
                  onDownloadInvoice(order);
                  setOpen(false);
                }}
              >
                Download Invoice PDF
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
