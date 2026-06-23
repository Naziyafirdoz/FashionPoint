"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  ChevronDown,
  CircleCheck,
  ClipboardCheck,
  Info,
  Package,
  Truck,
  type LucideIcon
} from "lucide-react";

const STORAGE_KEY = "fashionpoint_orders_fulfillment_guide_collapsed";

type WorkflowStep = {
  icon: LucideIcon;
  title: string;
  hint: string;
  status: string;
  action?: string;
};

/** Aligned with admin-order-ui.ts primary actions and workflow-validation.ts transitions. */
const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    icon: Bell,
    title: "Received",
    hint: "Checkout done. Admin email + notification.",
    status: "Pending · Processing"
  },
  {
    icon: ClipboardCheck,
    title: "Approve",
    hint: "Review order. Confirmation email sent.",
    status: "Confirmed",
    action: "Approve Order"
  },
  {
    icon: Package,
    title: "Pack",
    hint: "Packing starts when you open a confirmed order.",
    status: "Packing",
    action: "Ready For Shipping"
  },
  {
    icon: Truck,
    title: "Ship",
    hint: "Rapido guide for local. DTDC outstation.",
    status: "Shipped",
    action: "Mark Shipped"
  },
  {
    icon: CircleCheck,
    title: "Delivered",
    hint: "Mark after customer receives parcel.",
    status: "Delivered",
    action: "Mark Delivered"
  }
];

const ADMIN_TIPS = [
  "Approve from the list, detail page, or email link",
  "Staff mark Packed at /admin/worker when needed",
  "Open the Rapido guide on ready-to-ship local orders"
] as const;

function WorkflowGrid() {
  return (
    <ol
      className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
      aria-label="Order fulfillment steps"
    >
      {WORKFLOW_STEPS.map((step, index) => {
        const Icon = step.icon;
        return (
          <li key={step.title} className="min-w-0">
            <div className="flex h-full flex-col rounded-xl border border-primary/10 bg-white/90 p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wide text-primary/50">
                  Step {index + 1}
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold text-primary">{step.title}</p>
              <p className="mt-1 flex-1 text-[11px] leading-snug text-gray-600">{step.hint}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700">
                  {step.status}
                </span>
                {step.action ? (
                  <span className="rounded-md border border-primary/20 bg-primary/5 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                    {step.action}
                  </span>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
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
      className="sticky top-0 z-20 min-w-0 rounded-xl border border-primary/15 bg-blush shadow-sm"
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
            <p className="text-xs text-gray-600">Approve → pack → ship → deliver</p>
          </div>
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-primary transition-transform ${collapsed ? "" : "rotate-180"}`}
          aria-hidden
        />
      </button>

      {hydrated && !collapsed ? (
        <div className="space-y-2.5 border-t border-primary/10 px-4 pb-3 pt-2.5 sm:px-5 sm:pb-4">
          <WorkflowGrid />

          <div className="rounded-xl border border-primary/10 bg-white/80 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">Quick tips</p>
            <ul className="mt-1 space-y-0.5 text-xs leading-snug text-gray-600">
              {ADMIN_TIPS.map((tip) => (
                <li key={tip}>· {tip}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}
