"use client";

import Image from "next/image";
import type { DetectedColor } from "@/lib/color-analysis";
import { buildAnalysisSummary } from "@/lib/color-analysis";

type ColorMatcherSareePreviewBlockProps = {
  previewUrl: string;
  detectedColors: DetectedColor[];
};

export function ColorMatcherSareePreviewBlock({
  previewUrl,
  detectedColors
}: ColorMatcherSareePreviewBlockProps) {
  const summary = buildAnalysisSummary(detectedColors);
  const primary = summary.primary;

  return (
    <section aria-label="Uploaded saree preview">
      <h3 className="text-sm font-bold text-primary">Uploaded Saree Preview</h3>
      <div className="mt-2 overflow-hidden rounded-[12px] border border-[#F2E4E8] bg-[#FAFAFA]">
        <Image
          src={previewUrl}
          alt="Uploaded saree preview"
          width={480}
          height={320}
          className="mx-auto h-auto max-h-[130px] w-full object-contain"
          unoptimized
          loading="lazy"
        />
      </div>

      <div className="mt-2">
        <h4 className="text-xs font-semibold text-foreground/55">Detected Saree Color</h4>
        <div className="mt-1.5 flex items-center gap-2.5 rounded-[10px] border border-[#F2E4E8] bg-white px-2.5 py-2">
          <span
            className="h-9 w-9 shrink-0 rounded-full border-2 border-white shadow ring-1 ring-[#F3E5E8]"
            style={{ backgroundColor: primary.uncertain ? "#E5E7EB" : primary.hex }}
            role="img"
            aria-label={`${primary.name} color swatch`}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground/90">
              {primary.uncertain ? "Color not confidently detected" : primary.name}
            </p>
            <p className="text-xs text-foreground/55">{primary.confidence}% Confidence</p>
          </div>
        </div>
      </div>
    </section>
  );
}
