"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { BlouseColorRecommendation } from "@/lib/color-matcher";
import {
  getMatchQualityPresentation,
  getRecommendationOccasionTags,
  shortenExplanation
} from "@/lib/color-matcher-ui";

const TOP_RECOMMENDATION_COUNT = 3;

type ColorMatcherRecommendationsProps = {
  recommendations: BlouseColorRecommendation[];
};

function StarRating({ count, label }: { count: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-px" aria-label={`${label}, ${count} of 5 stars`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <span
          key={index}
          className={`text-[11px] leading-none ${index < count ? "text-secondary" : "text-foreground/20"}`}
          aria-hidden="true"
        >
          ★
        </span>
      ))}
    </span>
  );
}

function RecommendationCard({ rec }: { rec: BlouseColorRecommendation }) {
  const quality = getMatchQualityPresentation(rec.matchPercent, rec.rank);
  const occasions = getRecommendationOccasionTags(rec);

  return (
    <article className="group rounded-[14px] border border-[#F2E4E8] bg-gradient-to-br from-white to-[#FFFBFC] p-3 shadow-[0_2px_10px_rgba(122,13,43,0.04)] transition hover:border-primary/20 hover:shadow-[0_4px_16px_rgba(122,13,43,0.07)]">
      <div className="flex gap-3">
        <div className="shrink-0">
          <span
            className="block h-14 w-14 rounded-2xl border-2 border-white shadow-[0_3px_12px_rgba(0,0,0,0.08)] ring-1 ring-[#F3E5E8] transition group-hover:scale-[1.02]"
            style={{ backgroundColor: rec.hex }}
            role="img"
            aria-label={`${rec.name} blouse color swatch`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <h4 className="font-display text-base font-bold text-primary">{rec.name}</h4>

          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <StarRating count={quality.stars} label={quality.label} />
            <span className="text-xs font-semibold text-primary">{quality.label}</span>
          </div>
          <p className="mt-0.5 text-[11px] text-foreground/50">{quality.helperText}</p>

          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-foreground/70">
            {shortenExplanation(rec.reason)}
          </p>

          {occasions.length ? (
            <ul className="mt-2 flex flex-wrap gap-1" aria-label={`Suitable occasions for ${rec.name}`}>
              {occasions.map((occasion) => (
                <li
                  key={occasion}
                  className="rounded-full border border-[#F3E5E8] bg-white px-2 py-0.5 text-[10px] font-medium text-foreground/70"
                >
                  {occasion}
                </li>
              ))}
            </ul>
          ) : null}

          <Link
            href={rec.shopUrl}
            className="mt-2.5 inline-flex h-8 w-full items-center justify-center gap-1 rounded-full border border-primary/25 bg-white text-[11px] font-semibold text-primary transition hover:border-primary hover:bg-[#FFF5F7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-auto sm:px-4"
          >
            Browse {rec.name} Blouses
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function ColorMatcherRecommendations({ recommendations }: ColorMatcherRecommendationsProps) {
  const top = recommendations.slice(0, TOP_RECOMMENDATION_COUNT);
  if (!top.length) return null;

  return (
    <section aria-label="Recommended blouse colors">
      <h3 className="text-sm font-bold text-primary">Recommended Blouse Colors</h3>
      <p className="mt-0.5 text-xs text-foreground/55">
        Styling suggestions based on your saree&apos;s detected colors.
      </p>

      <ul className="mt-2.5 space-y-2.5">
        {top.map((rec) => (
          <li key={rec.slug}>
            <RecommendationCard rec={rec} />
          </li>
        ))}
      </ul>

      <p className="mt-3 rounded-lg bg-[#FFFBFC] px-2.5 py-2 text-[11px] leading-relaxed text-foreground/50">
        Color suggestions are generated from your uploaded saree and our current styling rules.
        Personal preferences may vary.
      </p>
    </section>
  );
}
