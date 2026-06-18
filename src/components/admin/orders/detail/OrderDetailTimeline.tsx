"use client";

import { buildFullOrderTimeline } from "@/lib/orders/timeline";
import { formatRefundDateTime } from "@/lib/orders/refunds";
import type { Order, ReturnRequest } from "@/types";

type OrderDetailTimelineProps = {
  order: Order;
  returnRequest?: ReturnRequest | null;
  includeRefundEvents?: boolean;
};

export function OrderDetailTimeline({
  order,
  returnRequest,
  includeRefundEvents = true
}: OrderDetailTimelineProps) {
  const entries = buildFullOrderTimeline(order, returnRequest, { includeRefundEvents });

  if (entries.length === 0) return null;

  return (
    <section id="timeline" className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        Order Timeline
      </h2>
      <ol className="relative mt-6 space-y-0">
        {entries.map((entry, index) => {
          const isLast = index === entries.length - 1;
          const dt = new Date(entry.at);
          return (
            <li key={`${entry.label}-${entry.at}-${index}`} className="relative flex gap-4 pb-8">
              {!isLast ? (
                <span
                  className="absolute left-[11px] top-6 h-full w-px bg-gray-200"
                  aria-hidden
                />
              ) : null}
              <span
                className={`relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  isLast
                    ? "bg-primary text-white"
                    : "bg-emerald-500 text-white"
                }`}
              >
                {isLast ? "●" : "✓"}
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="font-semibold text-gray-900">{entry.label}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {formatRefundDateTime(entry.at)}
                </p>
                <p className="text-xs text-gray-400">
                  {dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                  {" · "}
                  {entry.notes ?? "System"}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
