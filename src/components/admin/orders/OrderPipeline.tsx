"use client";

import { getPipelineSteps } from "@/lib/orders/workflow";
import type { Order } from "@/types";

type OrderPipelineProps = {
  order: Order;
};

export function OrderPipeline({ order }: OrderPipelineProps) {
  const steps = getPipelineSteps(order);

  if (order.status === "cancelled") {
    return (
      <section className="rounded-xl border bg-white p-5 lg:col-span-2">
        <h2 className="font-semibold text-primary">Order Pipeline</h2>
        <p className="mt-2 text-sm text-red-700">Order cancelled — pipeline stopped.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border bg-white p-5 lg:col-span-2">
      <h2 className="font-semibold text-primary">Order Pipeline</h2>
      <ol className="mt-4 space-y-2">
        {steps.map(({ step, completed, current }) => (
          <li
            key={step.key}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
              current ? "bg-primary/10 font-medium text-primary" : ""
            } ${completed ? "text-foreground" : "text-foreground/40"}`}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                completed
                  ? "bg-green-600 text-white"
                  : current
                    ? "border-2 border-primary text-primary"
                    : "border border-foreground/20"
              }`}
            >
              {completed ? "✓" : current ? "●" : ""}
            </span>
            {step.label}
          </li>
        ))}
      </ol>
    </section>
  );
}
