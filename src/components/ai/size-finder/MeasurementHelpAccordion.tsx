"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { SIZE_CHART_CONFIG } from "@/config/size-chart";
import { MeasurementGuideDiagram } from "@/components/ai/MeasurementGuideDiagrams";

export function MeasurementHelpAccordion() {
  const [openField, setOpenField] = useState<string | null>("bust");

  return (
    <section
      aria-labelledby="measurement-help-heading"
      className="rounded-[16px] border border-[#F3E5E8] bg-white p-3 shadow-[0_2px_14px_rgba(122,13,43,0.04)] sm:p-4"
    >
      <h2 id="measurement-help-heading" className="font-display text-base font-bold text-primary">
        How to Measure
      </h2>

      <div className="mt-2 space-y-1">
        {SIZE_CHART_CONFIG.measurementGuides.map((guide) => {
          const isOpen = openField === guide.field;
          const panelId = `measurement-help-${guide.field}`;

          return (
            <div key={guide.field} className="overflow-hidden rounded-lg border border-[#F3E5E8] bg-[#FFFBFC]">
              <button
                type="button"
                id={`${panelId}-button`}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenField(isOpen ? null : guide.field)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span className="font-medium text-[#2A2A2A]">{guide.title}</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 shrink-0 text-primary transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                />
              </button>

              <div
                id={panelId}
                role="region"
                aria-labelledby={`${panelId}-button`}
                hidden={!isOpen}
                className={`border-t border-[#F3E5E8] px-3 ${isOpen ? "block" : "hidden"}`}
              >
                <div className="flex gap-3 py-2.5">
                  <div className="flex shrink-0 items-center justify-center rounded-lg bg-[#FFF0F3] p-2">
                    <MeasurementGuideDiagram field={guide.field} className="h-16 w-14" />
                  </div>
                  <div className="min-w-0 flex-1 text-xs leading-relaxed text-foreground/75">
                    <p>{guide.description}</p>
                    <p className="mt-1 text-[11px] text-foreground/55">
                      <span className="font-semibold text-primary">Tip:</span> {guide.tip}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
