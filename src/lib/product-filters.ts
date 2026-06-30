import type { Product } from "@/types";
import { normalizeSizeFilter } from "@/config/size-chart";
import { getFacetLabel } from "@/lib/products/facet-registry";

export type ProductFilterParams = {
  category?: string | null;
  sub_category?: string | null;
  size?: string | null;
  color?: string | null;
  fabric?: string | null;
  neck?: string | null;
  sleeve?: string | null;
  closure?: string | null;
  occasion?: string | null;
  tag?: string | null;
  priceMin?: string | null;
  priceMax?: string | null;
  sort?: string | null;
  page?: string | null;
  limit?: string | null;
  slugs?: string | null;
};

const META_QUERY_KEYS = new Set([
  "category",
  "sub_category",
  "priceMin",
  "sort",
  "page",
  "limit",
  "slugs"
]);

export function parseFilterParams(searchParams: URLSearchParams): ProductFilterParams {
  return {
    category: searchParams.get("category"),
    sub_category: searchParams.get("sub_category"),
    size: searchParams.get("size"),
    color: searchParams.get("color"),
    fabric: searchParams.get("fabric"),
    neck: searchParams.get("neck"),
    sleeve: searchParams.get("sleeve"),
    closure: searchParams.get("closure"),
    occasion: searchParams.get("occasion"),
    tag: searchParams.get("tag"),
    priceMin: searchParams.get("priceMin"),
    priceMax: searchParams.get("priceMax"),
    sort: searchParams.get("sort"),
    page: searchParams.get("page"),
    limit: searchParams.get("limit"),
    slugs: searchParams.get("slugs")
  };
}

export function getActiveFilterEntries(
  searchParams: URLSearchParams
): Array<{ key: string; value: string }> {
  const entries: Array<{ key: string; value: string }> = [];

  for (const [key, value] of searchParams.entries()) {
    if (META_QUERY_KEYS.has(key)) continue;
    if (!value.trim()) continue;
    entries.push({ key, value });
  }

  return entries;
}

export function getActiveFilterDisplayLabel(key: string, value: string): string {
  if (key === "priceMax") {
    const amount = Number(value);
    return Number.isFinite(amount) ? `Up to ₹${amount.toLocaleString("en-IN")}` : value;
  }

  const label = getFacetLabel(key);
  return `${label}: ${value}`;
}

export function buildProductsQueryString(
  filters: ProductFilterParams & { category?: string | null }
): string {
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.sub_category) params.set("sub_category", filters.sub_category);
  if (filters.size) params.set("size", filters.size);
  if (filters.color) params.set("color", filters.color);
  if (filters.fabric) params.set("fabric", filters.fabric);
  if (filters.neck) params.set("neck", filters.neck);
  if (filters.sleeve) params.set("sleeve", filters.sleeve);
  if (filters.closure) params.set("closure", filters.closure);
  if (filters.occasion) params.set("occasion", filters.occasion);
  if (filters.tag) params.set("tag", filters.tag);
  if (filters.priceMin) params.set("priceMin", filters.priceMin);
  if (filters.priceMax) params.set("priceMax", filters.priceMax);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.page) params.set("page", filters.page);
  if (filters.limit) params.set("limit", filters.limit);
  if (filters.slugs) params.set("slugs", filters.slugs);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function filterMockProducts(products: Product[], filters: ProductFilterParams): Product[] {
  return products.filter((p) => {
    if (filters.size) {
      const normalized = normalizeSizeFilter(filters.size);
      if (!p.sizes?.some((s) => s.toLowerCase() === normalized.toLowerCase())) {
        return false;
      }
    }
    if (
      filters.color &&
      !p.colors?.some((c) => colorMatchesFilter(c, filters.color!))
    ) {
      return false;
    }
    if (filters.fabric && !p.fabric?.toLowerCase().includes(filters.fabric.toLowerCase())) {
      return false;
    }
    if (filters.neck && !p.neck_type?.toLowerCase().includes(filters.neck.toLowerCase())) {
      return false;
    }
    if (
      filters.sleeve &&
      !p.sleeve_type?.toLowerCase().includes(filters.sleeve.toLowerCase())
    ) {
      return false;
    }
    const min = filters.priceMin ? Number(filters.priceMin) : 0;
    const max = filters.priceMax ? Number(filters.priceMax) : Infinity;
    if (p.price < min || p.price > max) return false;
    return true;
  });
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const CANONICAL_COLOR_SLUGS: Record<string, string> = {
  gold: "gold",
  golden: "gold",
  "antique-gold": "gold",
  "light-gold": "gold",
  "rose-gold": "gold",
  maroon: "maroon",
  wine: "maroon",
  "wine-maroon": "maroon",
  "deep-maroon": "maroon",
  silver: "silver",
  grey: "silver",
  gray: "silver",
  "silver-zari": "silver",
  "gold-zari": "gold",
  pink: "pink",
  "rose-pink": "pink",
  "blush-pink": "pink",
  "magenta-pink": "pink",
  magenta: "pink",
  cream: "cream",
  beige: "beige",
  black: "black",
  red: "red",
  green: "green",
  "emerald-green": "green",
  blue: "blue",
  "navy-blue": "blue",
  "royal-blue": "blue",
  "royal-navy-blue": "blue",
  purple: "purple",
  white: "white"
};

export function normalizeProductColor(color: string): string {
  const trimmed = color.trim();
  if (!trimmed) return trimmed;

  const slug = slugify(trimmed);
  const canonical = CANONICAL_COLOR_SLUGS[slug];
  if (canonical) {
    return canonical
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  if (slug.includes("gold")) return "Gold";
  if (slug.includes("maroon") || slug.includes("wine")) return "Maroon";
  if (slug.includes("silver") || slug === "grey" || slug === "gray") return "Silver";

  return trimmed
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function normalizeColorFilter(color: string): string {
  return slugify(normalizeProductColor(color));
}

export function colorMatchesFilter(productColor: string, filterSlug: string): boolean {
  return (
    normalizeColorFilter(productColor) === normalizeColorFilter(filterSlug) ||
    slugify(productColor) === normalizeColorFilter(filterSlug)
  );
}

export function displayColorName(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
