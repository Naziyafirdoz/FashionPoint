import { SIZE_CHART_CONFIG, normalizeSizeFilter } from "@/config/size-chart";
import { SIZE_SEARCH_RULES } from "@/lib/search/search-config";
import { collectProductSizes } from "@/lib/search/size-search";
import { normalizeSearchText } from "@/lib/search/tokenize-query";
import type { Product } from "@/types";

/**
 * Oversize labels already used in catalog/search rules (not invented here).
 * Sourced from SIZE_SEARCH_RULES fallback + free-size entries.
 */
export const COMPATIBLE_OVERSIZE_SIZE_LABELS: readonly string[] = [
  ...new Set(
    SIZE_SEARCH_RULES.flatMap((rule) => [
      ...(rule.fallbackSizes ?? []),
      ...rule.exactSizes.filter((size) => size === "Free Size" || size === "Jumbo")
    ])
  )
];

const COMPATIBLE_OVERSIZE_SEARCH_TOKENS = new Set([
  "jumbo",
  "free size",
  "freesize",
  "free-size",
  "universal size",
  "universal"
]);

function normalizeSizeValue(size: string): string {
  return normalizeSizeFilter(size).trim().toLowerCase();
}

function sizesEqual(left: string, right: string): boolean {
  return normalizeSizeValue(left) === normalizeSizeValue(right);
}

/**
 * True when the URL size filter maps to an AI chart size (e.g. S34 → S(34)).
 * Fallback only runs for these — not for manual filters like ?size=Jumbo.
 */
export function isAiChartSizeFilter(size: string | null | undefined): boolean {
  if (!size?.trim()) return false;
  const normalized = normalizeSizeFilter(size.trim());
  return SIZE_CHART_CONFIG.sizes.some((entry) => entry.label === normalized);
}

/**
 * Whether a single product size string is a compatible Jumbo / Free Size / Universal label.
 */
export function isCompatibleOversizeSize(size: string): boolean {
  const trimmed = size.trim();
  if (!trimmed) return false;

  if (COMPATIBLE_OVERSIZE_SIZE_LABELS.some((label) => sizesEqual(trimmed, label))) {
    return true;
  }

  const token = normalizeSearchText(trimmed).replace(/\s+/g, " ");
  const compact = token.replace(/\s+/g, "");
  return (
    COMPATIBLE_OVERSIZE_SEARCH_TOKENS.has(token) ||
    COMPATIBLE_OVERSIZE_SEARCH_TOKENS.has(compact)
  );
}

export function productHasCompatibleOversizeSize(product: Product): boolean {
  const sizes = collectProductSizes(
    product.sizes,
    product.variants?.map((variant) => variant.size)
  );
  return sizes.some(isCompatibleOversizeSize);
}

/**
 * After exact chart-size filtering returns zero products, keep only blouses
 * marked with compatible oversize labels (Jumbo, Free Size, Universal, etc.).
 */
export function filterProductsByCompatibleOversizeSize(products: Product[]): Product[] {
  return products.filter(productHasCompatibleOversizeSize);
}

export function formatAiSizeDisplayLabel(label: string): string {
  const match = label.match(/^([^(]+)\(([^)]+)\)$/);
  if (match) return `${match[1]} (${match[2]})`;
  return label;
}

export function buildCompatibleOversizeFallbackMessage(recommendedSizeLabel: string): string {
  const display = formatAiSizeDisplayLabel(recommendedSizeLabel);
  return `No exact ${display} products are currently available. Showing compatible Jumbo / Free Size blouses.`;
}

export type SizeMatchMode = "exact" | "compatible_oversize";
