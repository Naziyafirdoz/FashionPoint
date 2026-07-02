import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeDbProduct, type DbRow } from "@/lib/products/get-by-slug";
import { STOREFRONT_PRODUCT_STATUSES } from "@/lib/products/status";
import { getProductReviewSummariesBatch } from "@/lib/reviews/service";
import type { Product } from "@/types";

const STYLE_CATALOG_SELECT = `
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
  categories(id, name, slug, description, image_url, sort_order, is_active, show_in_navbar, navbar_position),
  product_variants(id, product_id, size, color, sku, stock_quantity, price, compare_price)
`;

export async function loadStyleRecommenderCatalog(
  db: SupabaseClient
): Promise<Product[]> {
  const { data, error } = await db
    .from("products")
    .select(STYLE_CATALOG_SELECT)
    .in("status", STOREFRONT_PRODUCT_STATUSES)
    .order("name", { ascending: true });

  if (error || !data?.length) return [];

  const products = data.map((row) => normalizeDbProduct(row as unknown as DbRow));
  const summaries = await getProductReviewSummariesBatch(
    db,
    products.map((product) => product.id)
  );

  return products.map((product) => {
    const summary = summaries[product.id];
    if (!summary || summary.review_count <= 0) {
      const { rating: _rating, review_count: _reviewCount, ...rest } = product;
      return rest;
    }

    return {
      ...product,
      rating: summary.average_rating,
      review_count: summary.review_count
    };
  });
}

export function productsForRecommendations(
  products: Product[],
  recommendations: Array<{ productId: string }>
): Product[] {
  const idSet = new Set(recommendations.map((entry) => entry.productId));
  return products.filter((product) => idSet.has(product.id));
}
