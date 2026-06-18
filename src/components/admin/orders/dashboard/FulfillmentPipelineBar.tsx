"use client";

import { PIPELINE_STAGES } from "@/lib/orders/admin-order-ui";
import type { AdminOrdersTab } from "@/lib/orders/workflow";
import type { AdminOrderStatsV2 } from "@/lib/orders/refund-queue";

type FulfillmentPipelineBarProps = {
  stats: AdminOrderStatsV2;
  activeStage: AdminOrdersTab;
  onStageClick: (tab: AdminOrdersTab) => void;
};

export function FulfillmentPipelineBar({
  stats,
  activeStage,
  onStageClick
}: FulfillmentPipelineBarProps) {
  const counts: Record<string, number> = {
    processing: stats.processing,
    ready_to_ship: stats.readyToShip,
    out_for_delivery: stats.outForDelivery,
    delivered: stats.delivered
  };

  const clickStage = (id: string) => onStageClick(id as AdminOrdersTab);

  return (
    <section aria-label="Order pipeline" className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Order Pipeline
      </h2>
      <div className="hidden md:flex md:items-stretch md:gap-0">
        {PIPELINE_STAGES.map((stage, index) => {
          const isActive = activeStage === stage.id;
          const count = counts[stage.id] ?? 0;
          return (
            <div key={stage.id} className="flex min-w-0 flex-1 items-center">
              <button
                type="button"
                onClick={() => clickStage(stage.id)}
                className={`group flex w-full flex-col items-center rounded-xl px-2 py-3 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  isActive
                    ? "bg-primary/5 ring-2 ring-primary/30"
                    : "hover:bg-gray-50"
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold tabular-nums ${
                    isActive
                      ? "bg-primary text-white"
                      : count > 0
                        ? "bg-gray-100 text-gray-900 group-hover:bg-gray-200"
                        : "bg-gray-50 text-gray-400"
                  }`}
                >
                  {count}
                </span>
                <span
                  className={`mt-2 text-center text-xs font-medium leading-tight ${
                    isActive ? "text-primary" : "text-gray-600"
                  }`}
                >
                  {stage.label}
                </span>
              </button>
              {index < PIPELINE_STAGES.length - 1 ? (
                <div className="hidden h-px w-4 shrink-0 bg-gray-200 lg:block" aria-hidden />
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:hidden">
        {PIPELINE_STAGES.map((stage) => {
          const isActive = activeStage === stage.id;
          const count = counts[stage.id] ?? 0;
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => clickStage(stage.id)}
              className={`rounded-xl border px-3 py-2 text-left text-sm ${
                isActive
                  ? "border-primary/30 bg-primary/5 text-primary"
                  : "border-gray-200 bg-gray-50 text-gray-700"
              }`}
            >
              <span className="font-bold tabular-nums">{count}</span>
              <span className="mt-0.5 block text-xs">{stage.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
