import { colorMatchesFilter } from "@/lib/product-filters";
import type { Product } from "@/types";
import { formatInr } from "@/lib/style-recommender-ui";
import { isProductInStock } from "@/lib/stylist-assistant/inventory";
import type { StylistProductResult, StylistSessionFilters } from "@/lib/stylist-assistant/types";

const MAX_RESULTS = 6;
const MAX_SCORE = 100;

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function includesMatch(haystack: string, needle: string): boolean {
  const h = normalize(haystack);
  const n = normalize(needle);
  return h.includes(n) || n.includes(h);
}

function matchesOccasion(product: Product, occasion: string): boolean {
  return product.occasion?.some((entry) => includesMatch(entry, occasion)) ?? false;
}

function matchesColor(product: Product, color: string): boolean {
  if (product.colors?.some((entry) => colorMatchesFilter(entry, color))) return true;
  return product.variants?.some((variant) => colorMatchesFilter(variant.color, color)) ?? false;
}

function matchesCategory(product: Product, category: string): boolean {
  return Boolean(product.category?.name && includesMatch(product.category.name, category));
}

function matchesSize(product: Product, size: string): boolean {
  if (product.sizes?.some((entry) => includesMatch(entry, size))) return true;
  return product.variants?.some((variant) => includesMatch(variant.size, size)) ?? false;
}

function matchesTag(product: Product, tag: string): boolean {
  return product.tags?.some((entry) => includesMatch(entry, tag)) ?? false;
}

type Scored = {
  product: Product;
  score: number;
  matchReasons: string[];
};

function scoreProduct(product: Product, filters: StylistSessionFilters): Scored {
  let score = 0;
  const matchReasons: string[] = [];

  if (filters.occasion && matchesOccasion(product, filters.occasion)) {
    score += 25;
    matchReasons.push(`Matches ${filters.occasion} occasion`);
  }

  if (filters.color && matchesColor(product, filters.color)) {
    score += 25;
    matchReasons.push(`Available in ${filters.color}`);
  }

  if (filters.fabric && product.fabric && includesMatch(product.fabric, filters.fabric)) {
    score += 15;
    matchReasons.push(`Made in ${product.fabric}`);
  }

  if (filters.neck && product.neck_type && includesMatch(product.neck_type, filters.neck)) {
    score += 15;
    matchReasons.push(`Has ${product.neck_type} neck`);
  }

  if (filters.sleeve && product.sleeve_type && includesMatch(product.sleeve_type, filters.sleeve)) {
    score += 15;
    matchReasons.push(`Has ${product.sleeve_type} sleeves`);
  }

  if (filters.category && matchesCategory(product, filters.category)) {
    score += 10;
    matchReasons.push(`From ${product.category?.name ?? filters.category}`);
  }

  if (filters.tag && matchesTag(product, filters.tag)) {
    score += 10;
    matchReasons.push(`Includes ${filters.tag} work`);
  }

  if (filters.size && matchesSize(product, filters.size)) {
    score += 10;
    matchReasons.push(`Available in size ${filters.size}`);
  }

  if (filters.budgetMax != null) {
    if (product.price <= filters.budgetMax) {
      score += 20;
      matchReasons.push(`Within ${formatInr(filters.budgetMax)} budget`);
    } else if (product.price <= filters.budgetMax * 1.15) {
      score += 8;
    }
  }

  if (isProductInStock(product)) {
    score += 10;
  }

  if (filters.sort === "bestseller" && product.is_bestseller) {
    score += 5;
  }

  if (filters.sort === "new" && product.is_new) {
    score += 5;
  }

  return { product, score, matchReasons };
}

function passesHardFilters(product: Product, filters: StylistSessionFilters): boolean {
  if (filters.inStockOnly !== false && !isProductInStock(product)) return false;
  if (filters.occasion && !matchesOccasion(product, filters.occasion)) return false;
  if (filters.color && !matchesColor(product, filters.color)) return false;
  if (filters.fabric && (!product.fabric || !includesMatch(product.fabric, filters.fabric))) {
    return false;
  }
  if (filters.neck && (!product.neck_type || !includesMatch(product.neck_type, filters.neck))) {
    return false;
  }
  if (filters.sleeve && (!product.sleeve_type || !includesMatch(product.sleeve_type, filters.sleeve))) {
    return false;
  }
  if (filters.category && !matchesCategory(product, filters.category)) return false;
  if (filters.tag && !matchesTag(product, filters.tag)) return false;
  if (filters.size && !matchesSize(product, filters.size)) return false;
  if (filters.budgetMax != null && product.price > filters.budgetMax) return false;
  if (filters.sort === "new" && !product.is_new) return false;
  if (filters.sort === "bestseller" && !product.is_bestseller) return false;
  return true;
}

function compareScored(left: Scored, right: Scored): number {
  if (right.score !== left.score) return right.score - left.score;
  if (left.product.price !== right.product.price) return left.product.price - right.product.price;
  return left.product.name.localeCompare(right.product.name);
}

function toResults(scored: Scored[]): StylistProductResult[] {
  return scored.slice(0, MAX_RESULTS).map((entry) => ({
    product: entry.product,
    matchPercent: Math.min(99, Math.round((entry.score / MAX_SCORE) * 100)),
    matchReasons: entry.matchReasons,
    inStock: isProductInStock(entry.product)
  }));
}

export function searchStylistProducts(
  products: Product[],
  filters: StylistSessionFilters
): { exact: StylistProductResult[]; alternatives: StylistProductResult[] } {
  const exactScored = products
    .filter((product) => passesHardFilters(product, filters))
    .map((product) => scoreProduct(product, filters))
    .filter((entry) => entry.score > 0)
    .sort(compareScored);

  if (exactScored.length > 0) {
    return { exact: toResults(exactScored), alternatives: [] };
  }

  const relaxedBudget: StylistSessionFilters = {
    ...filters,
    budgetMax:
      filters.budgetMax != null ? Math.round(filters.budgetMax * 1.2) : filters.budgetMax
  };

  const relaxedScored = products
    .filter((product) => passesHardFilters(product, relaxedBudget))
    .map((product) => scoreProduct(product, relaxedBudget))
    .filter((entry) => entry.score > 0)
    .sort(compareScored);

  if (relaxedScored.length > 0) {
    return { exact: [], alternatives: toResults(relaxedScored) };
  }

  const scored = products
    .map((product) => scoreProduct(product, filters))
    .filter((entry) => entry.score > 0 && isProductInStock(entry.product))
    .sort(compareScored);

  return { exact: [], alternatives: toResults(scored) };
}

export function searchProductsByFabric(products: Product[], fabric: string): Product[] {
  return products
    .filter(
      (product) =>
        product.fabric && includesMatch(product.fabric, fabric) && isProductInStock(product)
    )
    .sort((a, b) => a.price - b.price);
}
