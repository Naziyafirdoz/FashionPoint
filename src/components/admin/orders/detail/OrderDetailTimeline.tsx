"use client";

import { buildFulfillmentMilestoneSteps } from "@/lib/orders/timeline";
import { formatRefundDateTime } from "@/lib/orders/refunds";
import { STORE_NAME } from "@/lib/site-config";
import type { Order } from "@/types";

type OrderDetailTimelineProps = {
  order: Order;
  variant?: "standalone" | "embedded";
  storeName?: string;
};

function TimelineContent({ order, storeName }: { order: Order; storeName: string }) {
  const steps = buildFulfillmentMilestoneSteps(order, storeName);

  if (steps.length === 0) {
    return <p className="text-sm text-gray-500">No timeline events yet.</p>;
  }

  const lastCompletedIndex = steps.reduce(
    (last, step, index) => (step.completed ? index : last),
    -1
  );

  return (
    <ol className="relative space-y-0">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const isCurrent = step.completed && index === lastCompletedIndex;
        const dt = step.at ? new Date(step.at) : null;

        return (
          <li key={step.label} className="relative flex gap-3 pb-3 last:pb-0">
            {!isLast ? (
              <span
                className={`absolute left-[11px] top-6 h-[calc(100%-0.75rem)] w-px ${
                  step.completed ? "bg-emerald-200" : "bg-gray-200"
                }`}
                aria-hidden
              />
            ) : null}
            <span
              className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                step.completed
                  ? isCurrent
                    ? "bg-primary text-white"
                    : "bg-emerald-500 text-white"
                  : "border border-gray-300 bg-white text-gray-400"
              }`}
              aria-hidden
            >
              {step.completed ? "✓" : "·"}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p
                className={`text-sm font-semibold ${
                  step.completed ? "text-gray-900" : "text-gray-400"
                }`}
              >
                {step.label}
              </p>
              {step.completed && dt ? (
                <>
                  <p className="mt-0.5 text-xs text-gray-500">{formatRefundDateTime(step.at!)}</p>
                  <p className="text-xs text-gray-400">
                    {dt.toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true
                    })}
                    {step.notes ? ` · ${step.notes}` : ""}
                  </p>
                </>
              ) : (
                <p className="mt-0.5 text-xs text-gray-400">Pending</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function OrderDetailTimeline({
  order,
  variant = "standalone",
  storeName = STORE_NAME
}: OrderDetailTimelineProps) {
  const heading = (
    <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Order Timeline</h2>
  );

  if (variant === "embedded") {
    return (
      <div id="timeline">
        {heading}
        <div className="mt-2">
          <TimelineContent order={order} storeName={storeName} />
        </div>
      </div>
    );
  }

  return (
    <section id="timeline" className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 lg:col-span-2">
      {heading}
      <div className="mt-3">
        <TimelineContent order={order} storeName={storeName} />
      </div>
    </section>
  );
}
