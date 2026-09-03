import { createServiceClient } from "@/lib/supabase";
import { normalizeDbProduct, type DbRow } from "@/lib/products/get-by-slug";
import type { Product } from "@/types";
import { withProductOfferPricing } from "@/lib/offers/attach-product-pricing";

const CANDIDATE_LIMIT = 48;
const RECOMMENDATION_LIMIT = 4;
const PLACEHOLDER_IMAGE = "/images/product-placeholder.jpg";

const CANDIDATE_SELECT = `
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
  occasion,
  tags,
  category_id,
  sub_category_id,
  stock_quantity,
  is_new,
  is_bestseller,
  is_featured,
  created_at,
  product_variants(id, product_id, size, color, sku, stock_quantity, price, compare_price)
`;

function withPlaceholderImage(product: Product): Product {
  const images = (product.images ?? []).filter(Boolean);
  return {
    ...product,
    images: images.length > 0 ? images : [PLACEHOLDER_IMAGE]
  };
}

function averagePrice(products: Product[]): number {
  if (products.length === 0) return 0;
  return products.reduce((sum, product) => sum + product.price, 0) / products.length;
}

function sharedOccasions(a: Product, b: Product): number {
  const left = new Set((a.occasion ?? []).map((value) => value.toLowerCase()));
  return (b.occasion ?? []).filter((value) => left.has(value.toLowerCase())).length;
}

function scoreCandidate(candidate: Product, wishlistProducts: Product[], avgWishlistPrice: number): number {
  if (wishlistProducts.length === 0) return 0;

  let score = 0;
  const categoryIds = new Set(
    wishlistProducts.map((product) => product.category_id).filter(Boolean) as string[]
  );
  const fabrics = new Set(
    wishlistProducts.map((product) => product.fabric?.toLowerCase()).filter(Boolean) as string[]
  );

  if (candidate.category_id && categoryIds.has(candidate.category_id)) {
    score += 4;
  }

  for (const wishlistProduct of wishlistProducts) {
    score += sharedOccasions(wishlistProduct, candidate) * 2;
  }

  if (candidate.fabric && fabrics.has(candidate.fabric.toLowerCase())) {
    score += 3;
  }

  if (avgWishlistPrice > 0) {
    const ratio = candidate.price / avgWishlistPrice;
    if (ratio >= 0.75 && ratio <= 1.25) {
      score += 2;
    } else if (ratio >= 0.5 && ratio <= 1.5) {
      score += 1;
    }
  }

  if (candidate.is_bestseller) score += 0.5;
  if (candidate.is_featured) score += 0.25;

  return score;
}

export async function getWishlistRecommendations(
  wishlistProducts: Product[],
  excludeIds: Set<string>
): Promise<Product[]> {
  const db = createServiceClient();
  if (!db) return [];

  const { data, error } = await db
    .from("products")
    .select(CANDIDATE_SELECT)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(CANDIDATE_LIMIT);

  if (error || !data) return [];

  const candidates = data
    .map((row) => withPlaceholderImage(normalizeDbProduct(row as DbRow)))
    .filter((product) => !excludeIds.has(product.id));

  const avgWishlistPrice = averagePrice(wishlistProducts);

  const ranked = candidates
    .map((candidate) => ({
      candidate,
      score: scoreCandidate(candidate, wishlistProducts, avgWishlistPrice)
    }))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.candidate.name.localeCompare(right.candidate.name);
    })
    .slice(0, RECOMMENDATION_LIMIT)
    .map((entry) => entry.candidate);

  return withProductOfferPricing(db, ranked);
}
