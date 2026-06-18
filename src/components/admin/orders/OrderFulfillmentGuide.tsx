"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ChevronDown, Info } from "lucide-react";

const STORAGE_KEY = "fashionpoint_orders_fulfillment_guide_collapsed";

type WorkflowStep = {
  step: number;
  title: string;
  description: string;
  statusLabel?: string;
  actionLabel?: string;
  resultLabel?: string;
};

const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    step: 1,
    title: "New Order",
    description: "Customer successfully places an order. The order appears in Admin Orders.",
    statusLabel: "Processing"
  },
  {
    step: 2,
    title: "Pack Order",
    description: "Verify products, payment and shipping details. Pack the order for dispatch.",
    actionLabel: "Pack Order",
    resultLabel: "Ready To Ship"
  },
  {
    step: 3,
    title: "Ship Order",
    description: "Hand over the package to courier. Add tracking information if available.",
    actionLabel: "Ship Order",
    resultLabel: "Out For Delivery"
  },
  {
    step: 4,
    title: "Mark Delivered",
    description: "Confirm the customer has received the package.",
    actionLabel: "Mark Delivered",
    resultLabel: "Delivered"
  }
];

const STATUS_FLOW = ["New Order", "Ready To Ship", "Out For Delivery", "Delivered"] as const;

const ADMIN_TIPS = [
  "Check new orders regularly",
  "Verify payment status before shipping",
  "Add tracking details whenever possible",
  "Mark delivered only after successful delivery",
  "Delivered orders are considered completed"
] as const;

function StepBadge({ children, variant }: { children: ReactNode; variant: "status" | "action" | "result" }) {
  const classes =
    variant === "action"
      ? "border-primary/30 bg-white text-primary"
      : variant === "result"
        ? "border-primary/20 bg-primary/5 text-primary"
        : "border-gray-200 bg-white text-gray-700";

  return (
    <span className={`inline-flex rounded-lg border px-2 py-0.5 text-[11px] font-semibold ${classes}`}>
      {children}
    </span>
  );
}

function DesktopStepper() {
  return (
    <ol className="hidden min-w-0 lg:grid lg:grid-cols-4 lg:gap-3">
      {WORKFLOW_STEPS.map((item, index) => (
        <li key={item.step} className="relative min-w-0">
          {index < WORKFLOW_STEPS.length - 1 ? (
            <span
              className="pointer-events-none absolute left-[calc(50%+1.25rem)] top-5 h-px w-[calc(100%-2.5rem)] bg-primary/20"
              aria-hidden
            />
          ) : null}
          <div className="relative rounded-xl border border-primary/10 bg-white/80 p-4 shadow-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
              {item.step}
            </div>
            <h3 className="mt-3 font-semibold text-primary">{item.title}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-gray-600">{item.description}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.statusLabel ? (
                <StepBadge variant="status">Status: {item.statusLabel}</StepBadge>
              ) : null}
              {item.actionLabel ? <StepBadge variant="action">{item.actionLabel}</StepBadge> : null}
              {item.resultLabel ? <StepBadge variant="result">→ {item.resultLabel}</StepBadge> : null}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function MobileTimeline() {
  return (
    <ol className="space-y-0 lg:hidden">
      {WORKFLOW_STEPS.map((item, index) => (
        <li key={item.step} className="relative flex gap-4 pb-6 last:pb-0">
          {index < WORKFLOW_STEPS.length - 1 ? (
            <span
              className="absolute left-4 top-8 h-[calc(100%-1rem)] w-px bg-primary/20"
              aria-hidden
            />
          ) : null}
          <div className="relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
            {item.step}
          </div>
          <div className="min-w-0 flex-1 rounded-xl border border-primary/10 bg-white/80 p-4 shadow-sm">
            <h3 className="font-semibold text-primary">{item.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{item.description}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.statusLabel ? (
                <StepBadge variant="status">Status: {item.statusLabel}</StepBadge>
              ) : null}
              {item.actionLabel ? <StepBadge variant="action">{item.actionLabel}</StepBadge> : null}
              {item.resultLabel ? <StepBadge variant="result">→ {item.resultLabel}</StepBadge> : null}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function StatusFlowVisual() {
  return (
    <div className="rounded-xl border border-primary/10 bg-white/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status flow</p>
      <div className="mx-auto mt-3 flex max-w-xs flex-col items-center gap-1">
        {STATUS_FLOW.map((label, index) => (
          <div key={label} className="flex w-full flex-col items-center gap-1">
            <span className="w-full rounded-lg border border-primary/15 bg-blush px-3 py-1.5 text-center text-xs font-semibold text-primary">
              {label}
            </span>
            {index < STATUS_FLOW.length - 1 ? (
              <span className="text-sm text-primary/40" aria-hidden>
                ↓
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function OrderFulfillmentGuide() {
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "true") setCollapsed(true);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return (
    <section
      className="sticky top-0 z-20 min-w-0 overflow-x-hidden rounded-xl border border-primary/15 bg-blush shadow-sm"
      aria-label="Order fulfillment workflow guide"
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={hydrated ? !collapsed : true}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-blush-dark/40 sm:px-5"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Info className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold text-primary sm:text-base">
              How Order Processing Works
            </p>
            <p className="text-xs text-gray-600 sm:truncate">
              <span className="block sm:inline">Order placed ≠ delivered.</span>{" "}
              <span className="block sm:inline">Follow every fulfillment step.</span>
            </p>
          </div>
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-primary transition-transform ${collapsed ? "" : "rotate-180"}`}
          aria-hidden
        />
      </button>

      {hydrated && !collapsed ? (
        <div className="space-y-5 border-t border-primary/10 px-4 pb-5 pt-4 sm:px-5">
          <header>
            <h2 className="font-display text-lg font-bold text-primary">Order Fulfillment Workflow</h2>
            <p className="mt-1 text-sm text-gray-600">
              Follow these steps after a customer places an order.
            </p>
          </header>

          <DesktopStepper />
          <MobileTimeline />

          <div
            className="rounded-xl border border-primary/20 bg-white p-4 shadow-sm"
            role="note"
            aria-label="Important notice"
          >
            <h3 className="flex items-center gap-2 font-semibold text-primary">
              <Info className="h-4 w-4 shrink-0" aria-hidden />
              Important
            </h3>
            <p className="mt-2 text-sm font-medium text-gray-800">
              Order Placed Successfully only means the order was confirmed.
            </p>
            <p className="mt-2 text-sm text-gray-600">The order still needs to be:</p>
            <ul className="mt-1 list-inside list-disc text-sm text-gray-600">
              <li>Packed</li>
              <li>Shipped</li>
              <li>Delivered</li>
            </ul>
            <p className="mt-3 text-sm font-medium text-primary">
              Only orders with Delivered status are completed.
            </p>
          </div>

          <StatusFlowVisual />

          <div className="rounded-xl border border-primary/10 bg-white/80 p-4">
            <h3 className="text-sm font-semibold text-primary">Admin tips</h3>
            <ul className="mt-3 space-y-2">
              {ADMIN_TIPS.map((tip) => (
                <li key={tip} className="flex gap-2 text-sm text-gray-700">
                  <span className="font-semibold text-primary" aria-hidden>
                    ✓
                  </span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}
