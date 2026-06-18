"use client";

import { useCallback, useState } from "react";
import type { DetectedColor } from "@/lib/color-analysis";
import type { BlouseColorRecommendation } from "@/lib/color-matcher";
import type { ColorAnalysisSummary } from "@/lib/color-analysis";

export type ColorMatchResult = {
  imageUrls: string[];
  summary: ColorAnalysisSummary;
  detectedColors: DetectedColor[];
  recommendations: BlouseColorRecommendation[];
};

export function useColorRecommendations() {
  const [result, setResult] = useState<ColorMatchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(
    async (imageUrls: string[], detectedColors: DetectedColor[]) => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/ai/color-matcher", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrls, detectedColors })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "Could not generate blouse recommendations.");
        }

        setResult(data as ColorMatchResult);
        return data as ColorMatchResult;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Recommendation failed.";
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    result,
    loading,
    error,
    fetchRecommendations,
    reset,
    setError
  };
}
