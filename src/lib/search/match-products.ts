import { matchProductColor } from "@/lib/search/color-search";
import { SEARCH_SCORE } from "@/lib/search/search-config";
import { matchProductSize } from "@/lib/search/size-search";
import type { SearchableProduct } from "@/lib/search/searchable-product";
import {
  normalizeSearchText,
  partialMatch,
  tokenizeSearchQuery,
  wordPrefixMatch
} from "@/lib/search/tokenize-query";

export type RankedSearchResult = {
  entry: SearchableProduct;
  score: number;
};

function scoreToken(entry: SearchableProduct, token: string): number {
  const normalizedToken = normalizeSearchText(token);
  if (!normalizedToken) return 0;

  let best = 0;

  if (entry.nameLower === normalizedToken) {
    best = Math.max(best, SEARCH_SCORE.exactName);
  } else if (entry.nameLower.includes(normalizedToken)) {
    best = Math.max(best, SEARCH_SCORE.nameContains);
  } else if (wordPrefixMatch(entry.nameLower, normalizedToken)) {
    best = Math.max(best, SEARCH_SCORE.nameWordPrefix);
  }

  if (entry.categoryNameLower && partialMatch(entry.categoryNameLower, normalizedToken)) {
    best = Math.max(best, SEARCH_SCORE.category);
  }

  if (entry.subCategoryNameLower && partialMatch(entry.subCategoryNameLower, normalizedToken)) {
    best = Math.max(best, SEARCH_SCORE.subCategory);
  }

  const colorStrength = matchProductColor(
    [...entry.colorsLower, ...entry.variantColors.map((color) => color.toLowerCase())],
    normalizedToken
  );
  if (colorStrength === "exact") {
    best = Math.max(best, SEARCH_SCORE.colorExact);
  } else if (colorStrength === "family") {
    best = Math.max(best, SEARCH_SCORE.colorFamily);
  }

  if (entry.fabricLower && partialMatch(entry.fabricLower, normalizedToken)) {
    best = Math.max(best, SEARCH_SCORE.fabric);
  }

  if (entry.occasionsLower.some((occasion) => partialMatch(occasion, normalizedToken))) {
    best = Math.max(best, SEARCH_SCORE.occasion);
  }

  const sizeStrength = matchProductSize(entry.sizes, entry.variantSizes, normalizedToken);
  if (sizeStrength === "exact") {
    best = Math.max(best, SEARCH_SCORE.sizeExact);
  } else if (sizeStrength === "fallback") {
    best = Math.max(best, SEARCH_SCORE.sizeFallback);
  }

  if (entry.neckLower && partialMatch(entry.neckLower, normalizedToken)) {
    best = Math.max(best, SEARCH_SCORE.neck);
  }

  if (entry.sleeveLower && partialMatch(entry.sleeveLower, normalizedToken)) {
    best = Math.max(best, SEARCH_SCORE.sleeve);
  }

  if (entry.closureLower && partialMatch(entry.closureLower, normalizedToken)) {
    best = Math.max(best, SEARCH_SCORE.closure);
  }

  if (entry.tagsLower.some((tag) => partialMatch(tag, normalizedToken))) {
    best = Math.max(best, SEARCH_SCORE.tag);
  }

  if (entry.skuLower && partialMatch(entry.skuLower, normalizedToken)) {
    best = Math.max(best, SEARCH_SCORE.sku);
  }

  if (
    entry.descriptionsLower &&
    (partialMatch(entry.descriptionsLower, normalizedToken) ||
      wordPrefixMatch(entry.descriptionsLower, normalizedToken))
  ) {
    best = Math.max(best, SEARCH_SCORE.description);
  }

  if (best === 0 && partialMatch(entry.attributeBlob, normalizedToken)) {
    best = SEARCH_SCORE.genericAttribute;
  }

  if (best === 0 && partialMatch(entry.seoLower, normalizedToken)) {
    best = Math.max(best, SEARCH_SCORE.description);
  }

  return best;
}

export function rankSearchProducts(
  products: SearchableProduct[],
  query: string
): RankedSearchResult[] {
  const tokens = tokenizeSearchQuery(query);
  if (tokens.length === 0) return [];

  const ranked: RankedSearchResult[] = [];

  for (const entry of products) {
    let totalScore = 0;
    let allTokensMatch = true;

    for (const token of tokens) {
      const tokenScore = scoreToken(entry, token);
      if (tokenScore === 0) {
        allTokensMatch = false;
        break;
      }
      totalScore += tokenScore;
    }

    if (allTokensMatch) {
      ranked.push({ entry, score: totalScore });
    }
  }

  ranked.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    return left.entry.product.name.localeCompare(right.entry.product.name);
  });

  return ranked;
}
