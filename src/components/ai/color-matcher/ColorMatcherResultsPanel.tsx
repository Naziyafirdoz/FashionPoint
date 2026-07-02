"use client";

import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import type { DetectedColor } from "@/lib/color-analysis";
import type { ColorMatchResult } from "@/hooks/useColorRecommendations";
import { buildStructuredStyleTips } from "@/lib/color-matcher-style-tips";
import { ColorMatcherSareePreviewBlock } from "./ColorMatcherSareePreviewBlock";
import { ColorMatcherAnalysisLoading } from "./ColorMatcherAnalysisLoading";
import { ColorMatcherRecommendations } from "./ColorMatcherRecommendations";
import { ColorMatcherStyleTipsSection } from "./ColorMatcherStyleTipsSection";
import { ColorMatcherErrorState } from "./ColorMatcherErrorState";
import type { UploadedImage } from "@/hooks/useColorExtraction";

type ColorMatcherResultsPanelProps = {
  images: UploadedImage[];
  detectedColors: DetectedColor[];
  result: ColorMatchResult | null;
  busy: boolean;
  analysisStep: string | null;
  error: string | null;
  onRetry: () => void;
  onReset: () => void;
};

export function ColorMatcherResultsPanel({
  images,
  detectedColors,
  result,
  busy,
  analysisStep,
  error,
  onRetry,
  onReset
}: ColorMatcherResultsPanelProps) {
  const styleTips = useMemo(() => {
    if (!detectedColors.length) {
      return { jewellery: null, occasions: [], avoid: [], notes: [] };
    }
    return buildStructuredStyleTips(detectedColors, result?.recommendations ?? []);
  }, [detectedColors, result?.recommendations]);

  const showLoading = busy && !detectedColors.length && !result;
  const showEmpty = !busy && !detectedColors.length && !result && !error;
  const hasResults = detectedColors.length > 0 || Boolean(result);

  return (
    <section
      aria-label="Color recommendations"
      className="rounded-[16px] border border-[#F2E4E8] bg-white p-3 shadow-[0_2px_16px_rgba(122,13,43,0.04)] sm:p-4"
    >
      <h2 className="text-sm font-bold text-primary">Color Recommendations</h2>
      <p className="mt-0.5 text-xs text-foreground/55">
        Suggestions generated from your uploaded saree.
      </p>

      <div className="mt-3 space-y-3">
        {error ? <ColorMatcherErrorState message={error} onRetry={onRetry} onReset={onReset} /> : null}

        {showLoading ? (
          <ColorMatcherAnalysisLoading message={analysisStep} />
        ) : null}

        {showEmpty ? (
          <div className="rounded-[12px] border border-dashed border-[#F2E4E8] bg-[#FFFBFC] px-4 py-5 text-center">
            <Sparkles className="mx-auto h-7 w-7 text-secondary/70" aria-hidden="true" />
            <p className="mt-2 text-xs text-foreground/65">
              Upload a saree photo to see detected colors and blouse color suggestions.
            </p>
          </div>
        ) : null}

        {busy && hasResults ? (
          <ColorMatcherAnalysisLoading message={analysisStep} compact />
        ) : null}

        {images[0] && detectedColors.length ? (
          <ColorMatcherSareePreviewBlock
            previewUrl={images[0].remoteUrl ?? images[0].previewUrl}
            detectedColors={detectedColors}
          />
        ) : null}

        {result?.recommendations?.length ? (
          <ColorMatcherRecommendations recommendations={result.recommendations} />
        ) : null}

        {result?.recommendations?.length ? (
          <ColorMatcherStyleTipsSection tips={styleTips} />
        ) : null}
      </div>
    </section>
  );
}
