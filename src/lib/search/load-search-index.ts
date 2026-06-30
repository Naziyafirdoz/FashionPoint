import type { SupabaseClient } from "@supabase/supabase-js";
import { STOREFRONT_PRODUCT_STATUSES } from "@/lib/products/status";
import type { DbRow } from "@/lib/products/get-by-slug";
import {
  mapRowToSearchableProduct,
  type SearchableProduct
} from "@/lib/search/searchable-product";
import { SEARCH_INDEX_CACHE_TTL_MS } from "@/lib/search/search-config";

const SEARCH_INDEX_SELECT = `
  id,
  slug,
  name,
  short_description,
  detailed_description,
  price,
  compare_price,
  status,
  is_active,
  images,
  sizes,
  colors,
  color_swatches,
  fabric,
  neck_type,
  sleeve_type,
  closure_type,
  occasion,
  tags,
  sku,
  stock_quantity,
  is_new,
  is_bestseller,
  is_featured,
  category_id,
  sub_category_id,
  created_at,
  seo_title,
  seo_description,
  categories(id, name, slug, sort_order, is_active, show_in_navbar, navbar_position, description, image_url),
  sub_categories(id, name, slug),
  product_variants(id, product_id, size, color, sku, stock_quantity, price, compare_price)
`;

export type SearchIndex = {
  products: SearchableProduct[];
  vocabulary: {
    productNames: string[];
    categories: string[];
    subCategories: string[];
    colors: string[];
    fabrics: string[];
    occasions: string[];
    sizes: string[];
    tags: string[];
  };
};

let searchIndexCache: { index: SearchIndex; fetchedAt: number } | null = null;

export function clearSearchIndexCache(): void {
  searchIndexCache = null;
}

function buildVocabulary(products: SearchableProduct[]): SearchIndex["vocabulary"] {
  const productNames = new Set<string>();
  const categories = new Set<string>();
  const subCategories = new Set<string>();
  const colors = new Set<string>();
  const fabrics = new Set<string>();
  const occasions = new Set<string>();
  const sizes = new Set<string>();
  const tags = new Set<string>();

  for (const entry of products) {
    productNames.add(entry.product.name);
    if (entry.product.category?.name) categories.add(entry.product.category.name);
    if (entry.subCategoryName) subCategories.add(entry.subCategoryName);
    entry.product.colors?.forEach((color) => colors.add(color));
    if (entry.product.fabric) fabrics.add(entry.product.fabric);
    entry.product.occasion?.forEach((value) => occasions.add(value));
    entry.product.sizes?.forEach((size) => sizes.add(size));
    entry.variantSizes.forEach((size) => sizes.add(size));
    entry.product.tags?.forEach((tag) => tags.add(tag));
  }

  return {
    productNames: [...productNames].sort((a, b) => a.localeCompare(b)),
    categories: [...categories].sort((a, b) => a.localeCompare(b)),
    subCategories: [...subCategories].sort((a, b) => a.localeCompare(b)),
    colors: [...colors].sort((a, b) => a.localeCompare(b)),
    fabrics: [...fabrics].sort((a, b) => a.localeCompare(b)),
    occasions: [...occasions].sort((a, b) => a.localeCompare(b)),
    sizes: [...sizes].sort((a, b) => a.localeCompare(b)),
    tags: [...tags].sort((a, b) => a.localeCompare(b))
  };
}

export async function loadSearchIndex(db: SupabaseClient): Promise<SearchIndex> {
  const now = Date.now();
  if (searchIndexCache && now - searchIndexCache.fetchedAt < SEARCH_INDEX_CACHE_TTL_MS) {
    return searchIndexCache.index;
  }

  const { data, error } = await db
    .from("products")
    .select(SEARCH_INDEX_SELECT)
    .in("status", STOREFRONT_PRODUCT_STATUSES)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const products = (data ?? []).map((row) => mapRowToSearchableProduct(row as unknown as DbRow));
  const index: SearchIndex = {
    products,
    vocabulary: buildVocabulary(products)
  };

  searchIndexCache = { index, fetchedAt: now };
  return index;
}
