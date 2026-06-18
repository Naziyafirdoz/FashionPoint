import type { ProductReviewSummary } from "@/lib/reviews/types";

export type RatingBreakdown = {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
};

export const EMPTY_RATING_BREAKDOWN: RatingBreakdown = {
  5: 0,
  4: 0,
  3: 0,
  2: 0,
  1: 0
};

export function buildRatingBreakdown(ratings: number[]): RatingBreakdown {
  const breakdown: RatingBreakdown = { ...EMPTY_RATING_BREAKDOWN };

  for (const rating of ratings) {
    const bucket = Math.min(5, Math.max(1, Math.round(rating))) as keyof RatingBreakdown;
    breakdown[bucket]++;
  }

  return breakdown;
}

/** Expects ratings from approved reviews only. */
export function buildProductReviewSummary(ratings: number[]): ProductReviewSummary {
  if (ratings.length === 0) {
    return { average_rating: 0, review_count: 0 };
  }

  const total = ratings.reduce((sum, rating) => sum + rating, 0);
  return {
    average_rating: Math.round((total / ratings.length) * 10) / 10,
    review_count: ratings.length
  };
}

export function aggregateReviewSummaries(
  rows: Array<{ product_id: string | null; rating: number | null }>
): Record<string, ProductReviewSummary> {
  const ratingsByProduct = new Map<string, number[]>();

  for (const row of rows) {
    if (!row.product_id) continue;
    const rating = Number(row.rating ?? 0);
    if (rating < 1 || rating > 5) continue;

    const list = ratingsByProduct.get(row.product_id) ?? [];
    list.push(rating);
    ratingsByProduct.set(row.product_id, list);
  }

  const summaries: Record<string, ProductReviewSummary> = {};
  for (const [productId, ratings] of ratingsByProduct) {
    summaries[productId] = buildProductReviewSummary(ratings);
  }

  return summaries;
}
