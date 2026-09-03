import { createServiceClient } from "@/lib/supabase";
import { normalizeDbProduct, type DbRow } from "@/lib/products/get-by-slug";
import type { Product } from "@/types";
import { withProductOfferPricing } from "@/lib/offers/attach-product-pricing";

const TRENDING_LIMIT = 4;
const PLACEHOLDER_IMAGE = "/images/product-placeholder.jpg";
const TRENDING_SELECT =
  "id,slug,name,short_description,detailed_description,price,compare_price,status,is_active,images,sizes,colors,fabric,neck_type,category_id,created_at,product_variants(stock_quantity)";

function withPlaceholderImage(product: Product): Product {
  const images = (product.images ?? []).filter(Boolean);
  return {
    ...product,
    images: images.length > 0 ? images : [PLACEHOLDER_IMAGE]
  };
}

export async function getTrendingProducts(): Promise<Product[]> {
  const db = createServiceClient();
  if (!db) return [];

  const { data, error } = await db
    .from("products")
    .select(TRENDING_SELECT)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(TRENDING_LIMIT);

  if (error || !data) return [];

  const products = data.map((row) => withPlaceholderImage(normalizeDbProduct(row as DbRow)));
  return withProductOfferPricing(db, products);
}
