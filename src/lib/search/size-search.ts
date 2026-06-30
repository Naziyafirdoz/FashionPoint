import { normalizeSizeFilter } from "@/config/size-chart";
import { SIZE_SEARCH_RULES, type SizeSearchRule } from "@/lib/search/search-config";
import { normalizeSearchText, partialMatch } from "@/lib/search/tokenize-query";

export type SizeMatchStrength = "none" | "exact" | "fallback";

function normalizeSizeValue(size: string): string {
  return normalizeSizeFilter(size).trim().toLowerCase();
}

function sizesEqual(left: string, right: string): boolean {
  return normalizeSizeValue(left) === normalizeSizeValue(right);
}

export function collectProductSizes(
  sizes: string[] | undefined,
  variantSizes: string[] | undefined
): string[] {
  const values = new Set<string>();
  sizes?.forEach((size) => {
    const cleaned = size?.trim();
    if (cleaned) values.add(cleaned);
  });
  variantSizes?.forEach((size) => {
    const cleaned = size?.trim();
    if (cleaned) values.add(cleaned);
  });
  return [...values];
}

function findSizeRule(token: string): SizeSearchRule | undefined {
  const normalized = normalizeSearchText(token);
  return SIZE_SEARCH_RULES.find((rule) =>
    rule.tokens.some((entry) => entry === normalized || normalized === entry.replace(/\s+/g, ""))
  );
}

export function matchProductSize(
  sizes: string[] | undefined,
  variantSizes: string[] | undefined,
  token: string
): SizeMatchStrength {
  const productSizes = collectProductSizes(sizes, variantSizes);
  if (productSizes.length === 0) return "none";

  const rule = findSizeRule(token);
  if (rule) {
    const exact = productSizes.some((size) =>
      rule.exactSizes.some((target) => sizesEqual(size, target))
    );
    if (exact) return "exact";

    const fallback = rule.fallbackSizes?.some((target) =>
      productSizes.some((size) => sizesEqual(size, target))
    );
    if (fallback) return "fallback";

    return "none";
  }

  const normalizedToken = normalizeSearchText(token);
  const generic = productSizes.some((size) => {
    const normalizedSize = normalizeSizeValue(size);
    return (
      partialMatch(normalizedSize, normalizedToken) ||
      partialMatch(normalizedToken, normalizedSize)
    );
  });

  return generic ? "exact" : "none";
}
