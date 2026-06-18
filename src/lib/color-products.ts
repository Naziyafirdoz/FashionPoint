import type { SupabaseClient } from "@supabase/supabase-js";
import { MOCK_PRODUCTS } from "@/lib/mock-data";
import { colorMatchesFilter, normalizeProductColor } from "@/lib/product-filters";
import type { BlouseColorRecommendation } from "@/lib/color-matcher";
import type { Product } from "@/types";

type ProductRow = {
  id: string;
  colors: string[] | null;
  stock_quantity: number | null;
  is_active: boolean | null;
  product_variants?: { stock_quantity: number | null; color?: string | null }[] | null;
};

const CACHE_TTL_MS = 60_000;

let productRowsCache: { rows: ProductRow[]; fetchedAt: number } | null = null;

export function clearProductColorCountCache(): void {
  productRowsCache = null;
}

function productColorsInclude(row: ProductRow, colorSlug: string): boolean {
  return row.colors?.some((c) => colorMatchesFilter(c, colorSlug)) ?? false;
}

function variantsForColor(row: ProductRow, colorSlug: string) {
  return (row.product_variants ?? []).filter(
    (v) => v.color && colorMatchesFilter(normalizeProductColor(v.color), colorSlug)
  );
}

/** Active product with stock for the requested color (variant stock when variants exist). */
export function productAvailableForColor(row: ProductRow, colorSlug: string): boolean {
  if (row.is_active === false) return false;

  const colorVariants = variantsForColor(row, colorSlug);
  const allVariants = row.product_variants ?? [];

  if (colorVariants.length > 0) {
    return colorVariants.some((v) => (v.stock_quantity ?? 0) > 0);
  }

  if (!productColorsInclude(row, colorSlug)) return false;

  if (allVariants.length > 0) {
    return allVariants.some((v) => (v.stock_quantity ?? 0) > 0);
  }

  return (row.stock_quantity ?? 0) > 0;
}

function countFromRows(rows: ProductRow[], colorSlug: string): number {
  return rows.filter((row) => productAvailableForColor(row, colorSlug)).length;
}

function countMockProducts(colorSlug: string): number {
  return MOCK_PRODUCTS.filter((p) => {
    if (!p.is_active) return false;

    const variantMatch = p.variants?.filter((v) => colorMatchesFilter(v.color, colorSlug)) ?? [];
    if (variantMatch.length > 0) {
      return variantMatch.some((v) => (v.stock_quantity ?? 0) > 0);
    }

    if (!p.colors?.some((c) => colorMatchesFilter(c, colorSlug))) return false;

    if (p.variants?.length) {
      return p.variants.some((v) => (v.stock_quantity ?? 0) > 0);
    }

    return (p.stock_quantity ?? 0) > 0;
  }).length;
}

async function fetchActiveProductRows(db: SupabaseClient): Promise<ProductRow[]> {
  const now = Date.now();
  if (productRowsCache && now - productRowsCache.fetchedAt < CACHE_TTL_MS) {
    return productRowsCache.rows;
  }

  const { data, error } = await db
    .from("products")
    .select("id, colors, stock_quantity, is_active, product_variants(stock_quantity, color)")
    .eq("is_active", true);

  if (error) {
    console.error("color-products: failed to load products", error.message);
    return productRowsCache?.rows ?? [];
  }

  const rows = (data ?? []) as ProductRow[];
  productRowsCache = { rows, fetchedAt: now };
  return rows;
}

export async function countProductsByColor(
  db: SupabaseClient | null,
  colorSlug: string
): Promise<number> {
  if (db) {
    const rows = await fetchActiveProductRows(db);
    return countFromRows(rows, colorSlug);
  }

  return countMockProducts(colorSlug);
}

export async function attachProductCounts(
  db: SupabaseClient | null,
  recommendations: Omit<BlouseColorRecommendation, "productCount" | "shopUrl">[]
): Promise<BlouseColorRecommendation[]> {
  const rows = db ? await fetchActiveProductRows(db) : null;

  return recommendations.map((rec) => {
    const productCount =
      rows !== null ? countFromRows(rows, rec.slug) : countMockProducts(rec.slug);

    return {
      ...rec,
      productCount,
      shopUrl: `/products?color=${encodeURIComponent(rec.slug)}`
    };
  });
}

export function filterProductsByColor(products: Product[], colorSlug: string): Product[] {
  return products.filter((p) => {
    if (!p.is_active) return false;

    const matchingVariants =
      p.variants?.filter((v) => colorMatchesFilter(v.color, colorSlug)) ?? [];

    if (matchingVariants.length > 0) {
      return matchingVariants.some((v) => (v.stock_quantity ?? 0) > 0);
    }

    if (!p.colors?.some((c) => colorMatchesFilter(c, colorSlug))) return false;

    if (p.variants?.length) {
      return p.variants.some((v) => (v.stock_quantity ?? 0) > 0);
    }

    return (p.stock_quantity ?? 0) > 0;
  });
}
