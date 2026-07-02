import type { Product } from "@/types";

export type StylePreferences = {
  occasion: string;
  stylePreference: string;
  neckStyle: string;
  sleeveStyle: string;
  budget: number;
};

export type StyleMatchQuality = {
  label: string;
  stars: number;
  badge: "Excellent" | "Very Good" | "Good";
};

export type BudgetStatus = {
  label: string;
  withinBudget: boolean;
};

export type RankBadge = {
  emoji: string;
  label: string;
};

const RANK_BADGES: RankBadge[] = [
  { emoji: "🏆", label: "Best Match" },
  { emoji: "⭐", label: "Recommended" },
  { emoji: "👍", label: "Good Alternative" }
];

export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function getMatchQuality(matchPercent: number, rank: number): StyleMatchQuality {
  if (rank === 0 || matchPercent >= 93) {
    return { label: "Excellent Match", stars: 5, badge: "Excellent" };
  }
  if (rank === 1 || matchPercent >= 86) {
    return { label: "Very Good Match", stars: 4, badge: "Very Good" };
  }
  return { label: "Good Match", stars: 3, badge: "Good" };
}

export function getRankBadge(rank: number): RankBadge | null {
  return RANK_BADGES[rank] ?? null;
}

export function getBudgetStatus(productPrice: number, budget: number): BudgetStatus {
  if (productPrice <= budget) {
    return { label: "Within Budget", withinBudget: true };
  }
  if (productPrice <= budget * 1.15) {
    return { label: "Slightly Above Budget", withinBudget: false };
  }
  return { label: "Above Budget", withinBudget: false };
}

export function buildRecommendationBullets(matchReasons: string[]): string[] {
  return matchReasons.filter(Boolean).slice(0, 4);
}

export function getProductCategoryLabel(product: Product): string | null {
  if (product.category?.name) return product.category.name;
  return null;
}

export function getOccasionBadge(product: Product): string | null {
  const occasion = product.occasion?.find(Boolean);
  return occasion ?? null;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function getStyleBadge(product: Product, stylePreference: string): string | null {
  const matchedTag = product.tags?.find((tag) =>
    normalize(tag).includes(normalize(stylePreference))
  );
  if (matchedTag) return matchedTag;
  return null;
}

export function hasCalculatedRating(
  product: Product
): product is Product & { rating: number; review_count: number } {
  return (
    typeof product.rating === "number" &&
    product.rating > 0 &&
    typeof product.review_count === "number" &&
    product.review_count > 0
  );
}

export function getDiscountPercent(product: Product): number | null {
  if (
    product.compare_price == null ||
    product.compare_price <= 0 ||
    product.compare_price <= product.price
  ) {
    return null;
  }

  return Math.round(((product.compare_price - product.price) / product.compare_price) * 100);
}
