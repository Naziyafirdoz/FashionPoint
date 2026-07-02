import type { DetectedColor } from "@/lib/color-analysis";
import { buildAnalysisSummary } from "@/lib/color-analysis";

type ColorMatcherDetectedColorsProps = {
  detectedColors: DetectedColor[];
};

function ColorSwatchCard({
  label,
  color
}: {
  label: string;
  color: DetectedColor | null;
}) {
  if (!color) return null;

  return (
    <div className="rounded-[14px] border border-[#F2E4E8] bg-gradient-to-r from-[#FFFBFC] to-white p-3.5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/50">{label}</p>
      {color.uncertain ? (
        <p className="mt-2 text-sm font-medium text-amber-800">{color.name}</p>
      ) : (
        <div className="mt-2 flex items-center gap-3">
          <span
            className="h-11 w-11 shrink-0 rounded-full border-2 border-white shadow-md ring-1 ring-[#F3E5E8]"
            style={{ backgroundColor: color.hex }}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-foreground/90">{color.name}</p>
            <p className="text-xs text-foreground/55">{color.confidence}% confidence</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function ColorMatcherDetectedColors({ detectedColors }: ColorMatcherDetectedColorsProps) {
  const summary = buildAnalysisSummary(detectedColors);

  return (
    <section aria-label="Detected saree colors">
      <h3 className="font-display text-lg font-bold text-primary">Detected Saree Colors</h3>
      <p className="mt-1 text-sm text-foreground/60">Dominant tones extracted from your photos.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <ColorSwatchCard label="Primary Color" color={summary.primary} />
        <ColorSwatchCard
          label={summary.secondary?.displayLabel ?? "Border Color"}
          color={summary.secondary}
        />
        <ColorSwatchCard label="Accent Color" color={summary.accent} />
      </div>
    </section>
  );
}
