"use client";

import { useState } from "react";
import type { StylePreferences } from "@/lib/style-recommender-ui";
import { StyleRecommenderEmptyState } from "./StyleRecommenderEmptyState";
import { StyleRecommenderLoading } from "./StyleRecommenderLoading";
import {
  StyleRecommendationCard,
  type StyleRecommendationResult
} from "./StyleRecommendationCard";
import { StyleQuickViewModal } from "./StyleQuickViewModal";

type StyleRecommenderResultsProps = {
  results: StyleRecommendationResult[];
  prefs: StylePreferences;
  loading: boolean;
  hasSearched: boolean;
};

export function StyleRecommenderResults({
  results,
  prefs,
  loading,
  hasSearched
}: StyleRecommenderResultsProps) {
  const [quickViewProduct, setQuickViewProduct] = useState<
    StyleRecommendationResult["product"] | null
  >(null);

  return (
    <section
      aria-label="AI recommendations"
      className="rounded-[16px] border border-[#F2E4E8] bg-white p-3 shadow-[0_2px_16px_rgba(122,13,43,0.04)] sm:p-4"
    >
      <h2 className="text-sm font-bold text-primary">AI Recommendations</h2>
      <p className="mt-0.5 text-xs text-foreground/55">
        Styles picked for your occasion, taste, and budget.
      </p>

      <div className="mt-3">
        {loading ? <StyleRecommenderLoading /> : null}

        {!loading && !hasSearched ? <StyleRecommenderEmptyState /> : null}

        {!loading && hasSearched && results.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-[#F2E4E8] bg-[#FFFBFC] px-4 py-8 text-center">
            <p className="text-sm font-semibold text-primary">No matches found</p>
            <p className="mt-1 text-xs text-foreground/60">
              Try adjusting your budget or style preferences.
            </p>
          </div>
        ) : null}

        {!loading && results.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {results.map((result, index) => (
              <StyleRecommendationCard
                key={result.product.id}
                result={result}
                rank={index}
                prefs={prefs}
                onQuickView={setQuickViewProduct}
              />
            ))}
          </div>
        ) : null}
      </div>

      <StyleQuickViewModal product={quickViewProduct} onClose={() => setQuickViewProduct(null)} />
    </section>
  );
}
