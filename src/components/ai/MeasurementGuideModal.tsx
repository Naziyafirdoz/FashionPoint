"use client";

import { X } from "lucide-react";
import { SIZE_CHART_CONFIG } from "@/config/size-chart";
import { MeasurementGuideDiagram } from "./MeasurementGuideDiagrams";

type MeasurementGuideModalProps = {
  open: boolean;
  onClose: () => void;
};

export function MeasurementGuideModal({ open, onClose }: MeasurementGuideModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        role="dialog"
        aria-labelledby="measurement-guide-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="measurement-guide-title" className="font-display text-xl font-bold text-primary">
              How to Measure?
            </h2>
            <p className="mt-1 text-sm text-foreground/70">
              Follow these steps for the most accurate AI size recommendation.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-foreground/60 hover:bg-blush"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <ul className="mt-6 space-y-6">
          {SIZE_CHART_CONFIG.measurementGuides.map((guide) => (
            <li key={guide.field} className="rounded-xl border border-accent/20 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex shrink-0 justify-center rounded-xl bg-blush/50 p-3 sm:w-36">
                  <MeasurementGuideDiagram field={guide.field} className="h-32 w-28" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-primary">{guide.title}</h3>
                  <p className="mt-1 text-sm text-foreground/80">{guide.description}</p>
                  <p className="mt-2 text-xs text-foreground/60">
                    <span className="font-medium">Tip:</span> {guide.tip}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <button type="button" onClick={onClose} className="btn-primary mt-6 w-full">
          Got it
        </button>
      </div>
    </div>
  );
}
