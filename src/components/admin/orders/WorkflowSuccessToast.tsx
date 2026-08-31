"use client";

import toast, { type Toast } from "react-hot-toast";
import { STORE_NAME } from "@/lib/site-config";

export type WorkflowSuccessKind = "pack" | "ship" | "deliver";

const WORKFLOW_TOAST_CONFIG: Record<
  WorkflowSuccessKind,
  { title: string; nextStep: string; tab: string; linkLabel: string }
> = {
  pack: {
    title: "Order packed successfully",
    nextStep: "Ship this order after handing it to the courier.",
    tab: "ready_to_ship",
    linkLabel: "View Ready To Ship Orders"
  },
  ship: {
    title: "Parcel handed to courier",
    nextStep: "The courier handles delivery.",
    tab: "shipped",
    linkLabel: "View Handed to Courier Orders"
  },
  deliver: {
    title: "Order marked as delivered",
    nextStep: "This order is now complete.",
    tab: "delivered",
    linkLabel: "View Delivered Orders"
  }
};

function nextStepFor(kind: WorkflowSuccessKind, storeName: string): string {
  if (kind === "ship") {
    return `${storeName} responsibility is complete. The courier handles delivery.`;
  }
  return WORKFLOW_TOAST_CONFIG[kind].nextStep;
}

function WorkflowToastCard({
  t,
  kind,
  onNavigate,
  storeName
}: {
  t: Toast;
  kind: WorkflowSuccessKind;
  onNavigate: (tab: string) => void;
  storeName: string;
}) {
  const cfg = WORKFLOW_TOAST_CONFIG[kind];
  const nextStep = nextStepFor(kind, storeName);

  return (
    <div
      className={`pointer-events-auto w-full max-w-sm rounded-xl border border-primary/15 bg-blush px-4 py-3 shadow-lg ${
        t.visible ? "opacity-100" : "opacity-0"
      }`}
      role="status"
    >
      <p className="font-semibold text-primary">✓ {cfg.title}</p>
      <p className="mt-1 text-sm text-gray-700">
        <span className="font-medium text-gray-900">Next step:</span> {nextStep}
      </p>
      <button
        type="button"
        className="mt-3 text-sm font-semibold text-primary underline-offset-2 hover:underline"
        onClick={() => {
          onNavigate(cfg.tab);
          toast.dismiss(t.id);
        }}
      >
        {cfg.linkLabel}
      </button>
    </div>
  );
}

export function showWorkflowSuccessToast(
  kind: WorkflowSuccessKind,
  onNavigate: (tab: string) => void,
  storeName: string = STORE_NAME
) {
  const cfg = WORKFLOW_TOAST_CONFIG[kind];
  onNavigate(cfg.tab);

  toast.custom(
    (t) => <WorkflowToastCard t={t} kind={kind} onNavigate={onNavigate} storeName={storeName} />,
    {
      duration: 8000
    }
  );
}

export function workflowTabForKind(kind: WorkflowSuccessKind): string {
  return WORKFLOW_TOAST_CONFIG[kind].tab;
}
