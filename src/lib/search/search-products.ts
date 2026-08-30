import type { SupabaseClient } from "@supabase/supabase-js";
import { loadSearchIndex } from "@/lib/search/load-search-index";
import { rankSearchProducts } from "@/lib/search/match-products";
import { SEARCH_DEFAULT_PRODUCT_LIMIT } from "@/lib/search/search-config";
import { buildSearchSuggestions } from "@/lib/search/suggestions";
import type { Product } from "@/types";
import { withProductOfferPricing } from "@/lib/offers/attach-product-pricing";

export type SearchProductsOptions = {
  query: string;
  page?: number;
  limit?: number;
};

export type SearchProductsResult = {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
};

export async function searchProducts(
  db: SupabaseClient,
  options: SearchProductsOptions
): Promise<SearchProductsResult> {
  const query = options.query.trim();
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.limit ?? SEARCH_DEFAULT_PRODUCT_LIMIT));

  if (!query) {
    return { products: [], total: 0, page, pageSize };
  }

  const index = await loadSearchIndex(db);
  const ranked = rankSearchProducts(index.products, query);
  const offset = (page - 1) * pageSize;
  const slice = ranked.slice(offset, offset + pageSize);
  const products = await withProductOfferPricing(
    db,
    slice.map((result) => result.entry.product)
  );

  return {
    products,
    total: ranked.length,
    page,
    pageSize
  };
}

export async function getSearchSuggestions(
  db: SupabaseClient,
  query: string,
  limit?: number
): Promise<string[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const index = await loadSearchIndex(db);
  return buildSearchSuggestions(index, trimmed, limit);
}

export { clearSearchIndexCache } from "@/lib/search/load-search-index";
