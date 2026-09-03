import { cache } from "react";
import { createServiceClient } from "@/lib/supabase";
import { resolveProductColorSwatches } from "@/lib/products/color-swatches";
import { resolveProductStatus, STOREFRONT_PRODUCT_STATUSES } from "@/lib/products/status";
import type { Product, ProductVariant } from "@/types";
import { withProductOfferPricing } from "@/lib/offers/attach-product-pricing";

export type DbRow = Record<string, unknown> & {
  product_variants?: Array<Record<string, unknown>>;
  categories?: Record<string, unknown> | null;
  sub_categories?: Record<string, unknown> | null;
};

export function normalizeDbProduct(row: DbRow): Product {
  const { product_variants, categories, ...rest } = row;

  const variants: ProductVariant[] = (product_variants ?? []).map((v) => ({
    id: String(v.id),
    product_id: String(v.product_id),
    size: String(v.size),
    color: String(v.color),
    sku: v.sku != null ? String(v.sku) : undefined,
    stock_quantity: Number(v.stock_quantity ?? 0),
    price: v.price != null ? Number(v.price) : undefined,
    compare_price: v.compare_price != null ? Number(v.compare_price) : undefined
  }));

  const totalStock = variants.reduce((sum, v) => sum + v.stock_quantity, 0);
  const colors = Array.isArray(rest.colors) ? (rest.colors as string[]) : [];
  const color_swatches = resolveProductColorSwatches(colors, rest.color_swatches);

  return {
    ...(rest as Omit<
      Product,
      | "price"
      | "compare_price"
      | "variants"
      | "category"
      | "images"
      | "status"
      | "colors"
      | "color_swatches"
    >),
    price: Number(rest.price),
    compare_price: rest.compare_price != null ? Number(rest.compare_price) : undefined,
    status: resolveProductStatus({
      status: typeof rest.status === "string" ? rest.status : null,
      is_active: typeof rest.is_active === "boolean" ? rest.is_active : null,
      total_stock: totalStock
    }),
    images: Array.isArray(rest.images) ? (rest.images as string[]) : [],
    colors: color_swatches.length > 0 ? color_swatches.map((swatch) => swatch.name) : colors,
    color_swatches,
    variants: variants.length > 0 ? variants : undefined,
    category: categories
      ? {
          id: String(categories.id),
          name: String(categories.name),
          slug: String(categories.slug),
          sort_order: Number(categories.sort_order ?? 0),
          is_active: Boolean(categories.is_active ?? true),
          show_in_navbar: Boolean(categories.show_in_navbar ?? false),
          navbar_position:
            categories.navbar_position != null ? Number(categories.navbar_position) : null,
          description:
            categories.description != null ? String(categories.description) : undefined,
          image_url: categories.image_url != null ? String(categories.image_url) : undefined
        }
      : undefined
  };
}

export const getProductBySlugFromDb = cache(async (slug: string): Promise<Product | null> => {
  const db = createServiceClient();
  if (!db) return null;

  const { data, error } = await db
    .from("products")
    .select(
      `
      *,
      categories(*),
      product_variants(id, product_id, size, color, sku, stock_quantity, price, compare_price)
    `
    )
    .eq("slug", slug)
    .in("status", STOREFRONT_PRODUCT_STATUSES)
    .maybeSingle();

  if (error || !data) return null;
  const product = normalizeDbProduct(data as DbRow);
  const [withOffers] = await withProductOfferPricing(db, [product]);
  return withOffers ?? product;
});
