"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import type { Product } from "@/types";
import type { StylePreferences } from "@/lib/style-recommender-ui";
import {
  buildRecommendationBullets,
  formatInr,
  getBudgetStatus,
  getDiscountPercent,
  getMatchQuality,
  getOccasionBadge,
  getProductCategoryLabel,
  getRankBadge,
  getStyleBadge,
  hasCalculatedRating
} from "@/lib/style-recommender-ui";

export type StyleRecommendationResult = {
  product: Product;
  matchPercent: number;
  reason: string;
  matchReasons: string[];
};

type StyleRecommendationCardProps = {
  result: StyleRecommendationResult;
  rank: number;
  prefs: StylePreferences;
  onQuickView: (product: Product) => void;
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

export function StyleRecommendationCard({
  result,
  rank,
  prefs,
  onQuickView
}: StyleRecommendationCardProps) {
  const { product, matchPercent, matchReasons } = result;
  const quality = getMatchQuality(matchPercent, rank);
  const rankBadge = getRankBadge(rank);
  const budgetStatus = getBudgetStatus(product.price, prefs.budget);
  const bullets = buildRecommendationBullets(matchReasons);
  const occasionBadge = getOccasionBadge(product);
  const styleBadge = getStyleBadge(product, prefs.stylePreference);
  const categoryLabel = getProductCategoryLabel(product);
  const discountPercent = getDiscountPercent(product);
  const showRating = hasCalculatedRating(product);
  const hasImage = Boolean(product.images?.[0]);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[14px] border border-[#F2E4E8] bg-gradient-to-br from-white to-[#FFFBFC] shadow-[0_2px_10px_rgba(122,13,43,0.04)] transition hover:border-primary/20 hover:shadow-[0_6px_20px_rgba(122,13,43,0.08)]">
      <div className="relative aspect-[4/5] overflow-hidden bg-[#FFFBFC]">
        {rankBadge ? (
          <span className="absolute left-2 top-2 z-10 rounded-full border border-white/80 bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-primary shadow-sm">
            <span aria-hidden="true">{rankBadge.emoji}</span> {rankBadge.label}
          </span>
        ) : null}

        {hasImage ? (
          <Image
            src={product.images![0]}
            alt={product.name}
            fill
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-xs text-foreground/50">
            Image not available
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 font-display text-sm font-bold leading-snug text-primary">
          {product.name}
        </h3>
        {categoryLabel ? (
          <p className="mt-0.5 text-[11px] text-foreground/55">{categoryLabel}</p>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="font-semibold text-foreground">{formatInr(product.price)}</p>
          {product.compare_price != null && product.compare_price > product.price ? (
            <p className="text-[11px] text-foreground/45 line-through">
              {formatInr(product.compare_price)}
            </p>
          ) : null}
          {discountPercent != null ? (
            <span className="rounded-full bg-secondary/15 px-2 py-0.5 text-[10px] font-semibold text-secondary">
              {discountPercent}% off
            </span>
          ) : null}
          <span className="rounded-full bg-primary/8 px-2 py-0.5 text-[10px] font-semibold text-primary">
            {matchPercent}% Match
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          <StarRating count={quality.stars} label={quality.label} />
          <span className="text-[11px] font-semibold text-primary">{quality.label}</span>
          <span className="rounded-full border border-[#F3E5E8] bg-white px-1.5 py-0.5 text-[10px] font-medium text-foreground/70">
            {quality.badge}
          </span>
        </div>

        {showRating ? (
          <p className="mt-1.5 text-[11px] text-foreground/60">
            {product.rating}/5 · {product.review_count} review
            {product.review_count === 1 ? "" : "s"}
          </p>
        ) : null}

        {occasionBadge || styleBadge || product.fabric ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {occasionBadge ? (
              <span className="rounded-full border border-[#F3E5E8] bg-white px-2 py-0.5 text-[10px] font-medium text-foreground/70">
                {occasionBadge}
              </span>
            ) : null}
            {styleBadge ? (
              <span className="rounded-full border border-[#F3E5E8] bg-white px-2 py-0.5 text-[10px] font-medium text-foreground/70">
                {styleBadge}
              </span>
            ) : null}
            {product.fabric ? (
              <span className="rounded-full border border-[#F3E5E8] bg-white px-2 py-0.5 text-[10px] font-medium text-foreground/70">
                {product.fabric}
              </span>
            ) : null}
          </div>
        ) : null}

        {product.neck_type || product.sleeve_type ? (
          <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-foreground/55">
            {product.neck_type ? <span>Neck: {product.neck_type}</span> : null}
            {product.sleeve_type ? <span>Sleeve: {product.sleeve_type}</span> : null}
          </div>
        ) : null}

        <div className="mt-2.5 rounded-lg bg-[#FFFBFC] px-2.5 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground/50">
            Budget
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
            <span className="text-foreground/60">Your budget {formatInr(prefs.budget)}</span>
            <span className="text-foreground/35">·</span>
            <span className="font-medium text-foreground">Product {formatInr(product.price)}</span>
          </div>
          <p
            className={`mt-1 inline-flex items-center gap-1 text-[11px] font-semibold ${
              budgetStatus.withinBudget ? "text-emerald-700" : "text-amber-700"
            }`}
          >
            {budgetStatus.withinBudget ? (
              <Check className="h-3 w-3" aria-hidden="true" />
            ) : null}
            {budgetStatus.label}
          </p>
        </div>

        {bullets.length ? (
          <div className="mt-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground/50">
              Why this was selected
            </p>
            <ul className="mt-1 space-y-0.5">
              {bullets.map((bullet) => (
                <li
                  key={bullet}
                  className="flex items-start gap-1.5 text-[11px] leading-relaxed text-foreground/70"
                >
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-secondary" aria-hidden="true" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-auto flex gap-2 pt-3">
          <button
            type="button"
            onClick={() => onQuickView(product)}
            className="inline-flex h-9 flex-1 items-center justify-center rounded-full border border-primary/25 bg-white text-[11px] font-semibold text-primary transition hover:border-primary hover:bg-[#FFF5F7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Quick View
          </button>
          <Link
            href={`/product/${product.slug}`}
            className="inline-flex h-9 flex-1 items-center justify-center gap-1 rounded-full bg-primary text-[11px] font-semibold text-white transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            View Product
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
