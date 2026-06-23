import { createServiceClient } from "@/lib/supabase";
import { normalizeDbProduct, type DbRow } from "@/lib/products/get-by-slug";
import type { Product } from "@/types";

const TRENDING_LIMIT = 4;
const PLACEHOLDER_IMAGE = "/images/product-placeholder.jpg";

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
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(TRENDING_LIMIT);

  if (error || !data) return [];

  return data.map((row) => withPlaceholderImage(normalizeDbProduct(row as DbRow)));
}
