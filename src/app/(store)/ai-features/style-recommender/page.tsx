"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Product } from "@/types";
import type { StylePreferences } from "@/lib/style-recommender-ui";
import { StyleRecommenderHero } from "@/components/ai/style-recommender/StyleRecommenderHero";
import { StyleRecommenderForm } from "@/components/ai/style-recommender/StyleRecommenderForm";
import { StyleRecommenderResults } from "@/components/ai/style-recommender/StyleRecommenderResults";
import type { StyleRecommendationResult } from "@/components/ai/style-recommender/StyleRecommendationCard";

type ApiRecommendation = {
  productId: string;
  matchPercent: number;
  reason: string;
  matchReasons?: string[];
};

const DEFAULT_PREFS: StylePreferences = {
  occasion: "Wedding",
  stylePreference: "Elegant",
  neckStyle: "Boat",
  sleeveStyle: "Half",
  budget: 3000
};

const LOADING_STEP_MS = 1400;

export default function StyleRecommenderPage() {
  const [prefs, setPrefs] = useState<StylePreferences>(DEFAULT_PREFS);
  const [results, setResults] = useState<StyleRecommendationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const loadingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearLoadingTimer = useCallback(() => {
    if (loadingTimerRef.current) {
      clearInterval(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearLoadingTimer, [clearLoadingTimer]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoadingStep(0);
    setHasSearched(true);
    clearLoadingTimer();
    loadingTimerRef.current = setInterval(() => {
      setLoadingStep((step) => step + 1);
    }, LOADING_STEP_MS);

    try {
      const res = await fetch("/api/ai/style-chat", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs)
      });
      const data = await res.json();
      const recommendations = (data.recommendations ?? []) as ApiRecommendation[];
      const products = (data.products ?? []) as Product[];
      const productById = new Map(products.map((product) => [product.id, product]));

      const mapped = recommendations
        .map((rec) => {
          const product = productById.get(rec.productId);
          if (!product) return null;
          return {
            product,
            matchPercent: rec.matchPercent,
            reason: rec.reason,
            matchReasons: rec.matchReasons ?? []
          };
        })
        .filter((item): item is StyleRecommendationResult => item !== null);

      setResults(mapped);
    } finally {
      clearLoadingTimer();
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] px-3 pb-6 pt-4 sm:px-5">
      <StyleRecommenderHero />

      <div className="mt-3 grid items-start gap-3 lg:grid-cols-[minmax(0,35%)_minmax(0,65%)] lg:gap-4">
        <StyleRecommenderForm
          prefs={prefs}
          loading={loading}
          loadingStep={loadingStep}
          onChange={setPrefs}
          onSubmit={submit}
        />

        <StyleRecommenderResults
          results={results}
          prefs={prefs}
          loading={loading}
          hasSearched={hasSearched}
        />
      </div>
    </div>
  );
}
