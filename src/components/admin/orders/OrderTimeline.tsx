"use client";

import { buildFullOrderTimeline } from "@/lib/orders/timeline";
import { formatRefundDateTime } from "@/lib/orders/refunds";
import type { Order, ReturnRequest } from "@/types";

type OrderTimelineProps = {
  order: Order;
  returnRequest?: ReturnRequest | null;
  includeRefundEvents?: boolean;
};

export function OrderTimeline({
  order,
  returnRequest,
  includeRefundEvents = true
}: OrderTimelineProps) {
  const entries = buildFullOrderTimeline(order, returnRequest, { includeRefundEvents });

  if (entries.length === 0) return null;

  return (
    <section className="rounded-xl border bg-white p-5 lg:col-span-2">
      <h2 className="font-semibold text-primary">Order Timeline</h2>
      <ol className="mt-4 space-y-4">
        {entries.map((entry, index) => (
          <li key={`${entry.label}-${entry.at}-${index}`} className="flex gap-4 text-sm">
            <div className="flex flex-col items-center">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" />
              {index < entries.length - 1 ? (
                <span className="mt-1 w-px flex-1 bg-accent/40" aria-hidden />
              ) : null}
            </div>
            <div className="pb-2">
              <p className="text-xs text-foreground/60">{formatRefundDateTime(entry.at)}</p>
              <p className="font-medium">{entry.label}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
