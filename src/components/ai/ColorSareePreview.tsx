"use client";

import Image from "next/image";
import { buildAnalysisSummary, type DetectedColor } from "@/lib/color-analysis";

type ColorSareePreviewProps = {
  previewUrl: string;
  detectedColors: DetectedColor[];
};

function ColorRow({
  label,
  color
}: {
  label: string;
  color: DetectedColor | null;
}) {
  if (!color) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg bg-white/60 px-3 py-2.5">
      <span
        className="h-9 w-9 shrink-0 rounded-full border-2 border-white shadow ring-1 ring-accent/10"
        style={{ backgroundColor: color.uncertain ? "#E5E7EB" : color.hex }}
      />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/50">
          {label}
        </p>
        <p className="truncate text-sm font-semibold text-foreground/90">
          {color.uncertain ? "Not confidently detected" : color.name}
        </p>
        <p className="text-xs text-foreground/60">{color.confidence}% Confidence</p>
      </div>
    </div>
  );
}

export function ColorSareePreview({ previewUrl, detectedColors }: ColorSareePreviewProps) {
  const summary = buildAnalysisSummary(detectedColors);

  return (
    <div className="mt-5 rounded-xl border border-accent/20 bg-gradient-to-b from-blush/40 to-white p-4">
      <p className="font-display text-base font-bold text-primary">Uploaded Saree Preview</p>
      <div className="mt-3 w-full overflow-hidden rounded-xl bg-blush shadow-inner">
        <Image
          src={previewUrl}
          alt="Uploaded saree preview"
          width={600}
          height={800}
          className="mx-auto h-auto max-h-[320px] w-full object-contain md:max-h-[450px]"
          unoptimized
          priority
        />
      </div>
      <div className="mt-4 space-y-2">
        <ColorRow label="Primary Color" color={summary.primary} />
        <ColorRow
          label={summary.secondary?.displayLabel ?? "Border / Embroidery"}
          color={summary.secondary}
        />
        <ColorRow label="Accent Color" color={summary.accent} />
      </div>
    </div>
  );
}
