import type { AdminReviewRow } from "@/lib/admin/reviews";
import { buildProductReviewSummary, buildRatingBreakdown } from "@/lib/reviews/rating-stats";

const MIN_REVIEWS_TOP_RATED = 2;
const MIN_REVIEWS_LOW_RATED = 3;
const RECENT_REVIEWS_LIMIT = 10;
const RANKED_PRODUCTS_LIMIT = 8;

export const REVIEW_ANALYTICS_MIN_TOP_RATED = MIN_REVIEWS_TOP_RATED;
export const REVIEW_ANALYTICS_MIN_LOW_RATED = MIN_REVIEWS_LOW_RATED;

export type ReviewOverview = {
  totalReviews: number;
  averageRating: number;
  verifiedPurchaseReviews: number;
  reviewsToday: number;
};

export type RatingDistributionRow = {
  stars: number;
  label: string;
  count: number;
  percentage: number;
};

export type RecentReviewRow = {
  id: string;
  customerName: string;
  productImage: string | null;
  productName: string;
  rating: number;
  title: string | null;
  dateLabel: string;
};

export type RatedProductRow = {
  productId: string;
  productName: string;
  productImage: string | null;
  averageRating: number;
  reviewCount: number;
};

export type RatingTrendPoint = {
  key: string;
  label: string;
  averageRating: number;
  reviewCount: number;
};

export type VerifiedPurchaseMetric = {
  count: number;
  total: number;
  percent: number | null;
};

export type ReviewAnalyticsSnapshot = {
  overview: ReviewOverview;
  ratingDistribution: RatingDistributionRow[];
  recentReviews: RecentReviewRow[];
  topRatedProducts: RatedProductRow[];
  lowRatedProducts: RatedProductRow[];
  mostReviewedProducts: RatedProductRow[];
  verifiedPurchase: VerifiedPurchaseMetric;
  dailyTrend: RatingTrendPoint[];
  weeklyTrend: RatingTrendPoint[];
  monthlyTrend: RatingTrendPoint[];
};

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function approvedReviews(reviews: AdminReviewRow[]) {
  return reviews.filter((review) => review.status === "approved");
}

function formatReviewDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function weekKey(iso: string) {
  const d = new Date(iso);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return dayKey(monday.toISOString());
}

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatDayLabel(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function formatWeekLabel(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function formatMonthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function aggregateProducts(reviews: AdminReviewRow[]): RatedProductRow[] {
  const map = new Map<
    string,
    { productName: string; productImage: string | null; ratings: number[] }
  >();

  for (const review of reviews) {
    if (!review.product_id || review.status !== "approved") continue;
    const rating = Number(review.rating);
    if (rating < 1 || rating > 5) continue;

    const existing = map.get(review.product_id) ?? {
      productName: review.product_name,
      productImage: review.product_image,
      ratings: []
    };
    existing.ratings.push(rating);
    if (!existing.productImage && review.product_image) {
      existing.productImage = review.product_image;
    }
    map.set(review.product_id, existing);
  }

  return [...map.entries()].map(([productId, data]) => {
    const summary = buildProductReviewSummary(data.ratings);
    return {
      productId,
      productName: data.productName,
      productImage: data.productImage,
      averageRating: summary.average_rating,
      reviewCount: summary.review_count
    };
  });
}

function buildRatingTrend(
  reviews: AdminReviewRow[],
  keyFn: (iso: string) => string,
  labelFn: (key: string) => string,
  limit: number
): RatingTrendPoint[] {
  const buckets = new Map<string, number[]>();

  for (const review of approvedReviews(reviews)) {
    const rating = Number(review.rating);
    if (rating < 1 || rating > 5) continue;
    const key = keyFn(review.created_at);
    const list = buckets.get(key) ?? [];
    list.push(rating);
    buckets.set(key, list);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-limit)
    .map(([key, ratings]) => {
      const summary = buildProductReviewSummary(ratings);
      return {
        key,
        label: labelFn(key),
        averageRating: summary.average_rating,
        reviewCount: summary.review_count
      };
    })
    .filter((point) => point.reviewCount > 0);
}

export function computeReviewAnalytics(reviews: AdminReviewRow[]): ReviewAnalyticsSnapshot {
  const approved = approvedReviews(reviews);
  const todayStart = startOfToday();

  const overview: ReviewOverview = {
    totalReviews: reviews.length,
    averageRating: buildProductReviewSummary(approved.map((r) => r.rating)).average_rating,
    verifiedPurchaseReviews: reviews.filter((r) => r.is_verified_purchase).length,
    reviewsToday: reviews.filter((r) => new Date(r.created_at) >= todayStart).length
  };

  const breakdown = buildRatingBreakdown(approved.map((r) => r.rating));
  const totalApproved = approved.length;
  const ratingDistribution: RatingDistributionRow[] = ([5, 4, 3, 2, 1] as const)
    .map((stars) => {
      const count = breakdown[stars];
      return {
        stars,
        label: `${stars} ⭐`,
        count,
        percentage: totalApproved > 0 ? Math.round((count / totalApproved) * 100) : 0
      };
    })
    .filter((row) => row.count > 0);

  const recentReviews: RecentReviewRow[] = [...reviews]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, RECENT_REVIEWS_LIMIT)
    .map((review) => ({
      id: review.id,
      customerName: review.customer_name,
      productImage: review.product_image,
      productName: review.product_name,
      rating: review.rating,
      title: review.title,
      dateLabel: formatReviewDate(review.created_at)
    }));

  const productRows = aggregateProducts(reviews);

  const topRatedProducts = productRows
    .filter((row) => row.reviewCount >= MIN_REVIEWS_TOP_RATED)
    .sort((a, b) => b.averageRating - a.averageRating || b.reviewCount - a.reviewCount)
    .slice(0, RANKED_PRODUCTS_LIMIT);

  const lowRatedProducts =
    productRows.filter((row) => row.reviewCount >= MIN_REVIEWS_LOW_RATED).length >= 2
      ? productRows
          .filter((row) => row.reviewCount >= MIN_REVIEWS_LOW_RATED)
          .sort((a, b) => a.averageRating - b.averageRating || a.reviewCount - b.reviewCount)
          .slice(0, RANKED_PRODUCTS_LIMIT)
      : [];

  const mostReviewedProducts = [...productRows]
    .sort((a, b) => b.reviewCount - a.reviewCount)
    .slice(0, RANKED_PRODUCTS_LIMIT);

  const verifiedCount = reviews.filter((r) => r.is_verified_purchase).length;

  return {
    overview,
    ratingDistribution,
    recentReviews,
    topRatedProducts,
    lowRatedProducts,
    mostReviewedProducts,
    verifiedPurchase: {
      count: verifiedCount,
      total: reviews.length,
      percent: reviews.length > 0 ? Math.round((verifiedCount / reviews.length) * 100) : null
    },
    dailyTrend: buildRatingTrend(reviews, dayKey, formatDayLabel, 30),
    weeklyTrend: buildRatingTrend(reviews, weekKey, formatWeekLabel, 12),
    monthlyTrend: buildRatingTrend(reviews, monthKey, formatMonthLabel, 12)
  };
}
