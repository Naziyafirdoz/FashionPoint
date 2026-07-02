import type { Product } from "@/types";
import type { StylePreferences } from "@/lib/style-recommender-ui";
import { formatInr } from "@/lib/style-recommender-ui";

export type StyleRecommendation = {
  productId: string;
  score: number;
  matchPercent: number;
  reason: string;
  matchReasons: string[];
};

const MAX_SCORE = 100;
const RECOMMENDATION_LIMIT = 6;

const SCORE_WEIGHTS = {
  occasion: 25,
  neck: 20,
  sleeve: 20,
  style: 15,
  budget: 20
} as const;

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function includesNormalized(haystack: string, needle: string): boolean {
  const h = normalize(haystack);
  const n = normalize(needle);
  return h.includes(n) || n.includes(h);
}

function matchesOccasion(product: Product, occasion: string): boolean {
  return (
    product.occasion?.some(
      (entry) =>
        normalize(entry) === normalize(occasion) || includesNormalized(entry, occasion)
    ) ?? false
  );
}

function matchesNeck(product: Product, neckStyle: string): boolean {
  return Boolean(product.neck_type && includesNormalized(product.neck_type, neckStyle));
}

function matchesSleeve(product: Product, sleeveStyle: string): boolean {
  return Boolean(product.sleeve_type && includesNormalized(product.sleeve_type, sleeveStyle));
}

function matchesStylePreference(product: Product, stylePreference: string): boolean {
  return (
    product.tags?.some((tag) => includesNormalized(tag, stylePreference)) ?? false
  );
}

function scoreProduct(product: Product, prefs: StylePreferences): StyleRecommendation | null {
  let score = 0;
  const matchReasons: string[] = [];

  if (matchesOccasion(product, prefs.occasion)) {
    score += SCORE_WEIGHTS.occasion;
    matchReasons.push(`Matches your ${prefs.occasion} occasion`);
  }

  if (matchesNeck(product, prefs.neckStyle) && product.neck_type) {
    score += SCORE_WEIGHTS.neck;
    matchReasons.push(`Matches your ${product.neck_type} neck preference`);
  }

  if (matchesSleeve(product, prefs.sleeveStyle) && product.sleeve_type) {
    score += SCORE_WEIGHTS.sleeve;
    matchReasons.push(`Matches your ${product.sleeve_type} sleeve preference`);
  }

  if (matchesStylePreference(product, prefs.stylePreference)) {
    score += SCORE_WEIGHTS.style;
    matchReasons.push(`Fits your ${prefs.stylePreference} preference`);
  }

  if (product.price <= prefs.budget) {
    score += SCORE_WEIGHTS.budget;
    matchReasons.push(`Within your ${formatInr(prefs.budget)} budget`);
  } else if (product.price <= prefs.budget * 1.15) {
    score += Math.round(SCORE_WEIGHTS.budget * 0.4);
  }

  if (score <= 0) return null;

  const matchPercent = Math.min(99, Math.round((score / MAX_SCORE) * 100));

  return {
    productId: product.id,
    score,
    matchPercent,
    matchReasons,
    reason: matchReasons.join(". ")
  };
}

function compareRecommendations(
  left: StyleRecommendation,
  right: StyleRecommendation,
  productById: Map<string, Product>
): number {
  if (right.score !== left.score) return right.score - left.score;

  const leftProduct = productById.get(left.productId);
  const rightProduct = productById.get(right.productId);
  const leftPrice = leftProduct?.price ?? 0;
  const rightPrice = rightProduct?.price ?? 0;
  if (leftPrice !== rightPrice) return leftPrice - rightPrice;

  const leftName = leftProduct?.name ?? left.productId;
  const rightName = rightProduct?.name ?? right.productId;
  return leftName.localeCompare(rightName);
}

export function getDeterministicStyleRecommendations(
  preferences: StylePreferences,
  products: Product[]
): StyleRecommendation[] {
  const productById = new Map(products.map((product) => [product.id, product]));

  const scored = products
    .map((product) => scoreProduct(product, preferences))
    .filter((entry): entry is StyleRecommendation => entry !== null)
    .sort((left, right) => compareRecommendations(left, right, productById));

  return scored.slice(0, RECOMMENDATION_LIMIT);
}

export function parseStylePreferences(input: Record<string, unknown>): StylePreferences | null {
  const occasion = typeof input.occasion === "string" ? input.occasion.trim() : "";
  const stylePreference =
    typeof input.stylePreference === "string" ? input.stylePreference.trim() : "";
  const neckStyle = typeof input.neckStyle === "string" ? input.neckStyle.trim() : "";
  const sleeveStyle = typeof input.sleeveStyle === "string" ? input.sleeveStyle.trim() : "";
  const budget = Number(input.budget);

  if (!occasion || !stylePreference || !neckStyle || !sleeveStyle) return null;
  if (!Number.isFinite(budget) || budget <= 0) return null;

  return {
    occasion,
    stylePreference,
    neckStyle,
    sleeveStyle,
    budget
  };
}
