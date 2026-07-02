"use client";

import { Loader2 } from "lucide-react";

const STEPS = [
  { id: "analyze", label: "Analyzing saree…" },
  { id: "detect", label: "Detecting colors…" },
  { id: "recommend", label: "Finding matching blouse colors…" }
] as const;

function stepIndexFromMessage(message: string | null): number {
  if (!message) return 0;
  const lower = message.toLowerCase();
  if (lower.includes("analyzing")) return 0;
  if (lower.includes("detect")) return 1;
  if (lower.includes("blouse") || lower.includes("finding") || lower.includes("complement")) return 2;
  return 0;
}

type ColorMatcherAnalysisLoadingProps = {
  message: string | null;
  compact?: boolean;
};

export function ColorMatcherAnalysisLoading({
  message,
  compact = false
}: ColorMatcherAnalysisLoadingProps) {
  const activeIndex = stepIndexFromMessage(message);
  const headline = message ?? "Analyzing saree…";

  if (compact) {
    return (
      <p
        className="inline-flex items-center gap-2 rounded-lg bg-[#FFF5F7] px-3 py-1.5 text-xs text-foreground/70"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden="true" />
        {headline}
      </p>
    );
  }

  return (
    <div
      className="rounded-[12px] border border-[#F2E4E8] bg-[#FFFBFC] p-3"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-center gap-2">
        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" aria-hidden="true" />
        <p className="text-sm font-semibold text-primary">{headline}</p>
      </div>
      <ol className="mt-2.5 space-y-1.5" aria-label="Analysis progress">
        {STEPS.map((step, index) => {
          const done = index < activeIndex;
          const active = index === activeIndex;
          return (
            <li key={step.id} className="flex items-center gap-2 text-xs">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  done
                    ? "bg-emerald-100 text-emerald-700"
                    : active
                      ? "bg-primary text-white"
                      : "bg-[#F3E5E8] text-foreground/40"
                }`}
                aria-hidden="true"
              >
                {done ? "✓" : index + 1}
              </span>
              <span className={active ? "font-medium text-primary" : "text-foreground/55"}>
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
