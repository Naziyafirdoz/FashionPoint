import type { SupabaseClient } from "@supabase/supabase-js";

export type VerifiedStockProduct = {
  id: string;
  name: string;
  slug: string;
  images: string[];
  stock_quantity: number;
};

export async function verifyProductForStockNotification(
  db: SupabaseClient,
  productId: string
): Promise<{ ok: true; product: VerifiedStockProduct } | { ok: false; message: string }> {
  const { data, error } = await db
    .from("products")
    .select("id, name, slug, images, stock_quantity")
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    console.error("[back-in-stock] product lookup failed", {
      productId,
      message: error.message
    });
    return { ok: false, message: "Something went wrong. Please try again." };
  }

  if (!data) {
    return { ok: false, message: "This product is no longer available." };
  }

  const slug = data.slug?.trim();
  if (!slug) {
    console.error("[back-in-stock] product missing slug", { productId });
    return { ok: false, message: "This product is not available for notifications." };
  }

  return {
    ok: true,
    product: {
      id: data.id,
      name: data.name,
      slug,
      images: Array.isArray(data.images) ? data.images : [],
      stock_quantity: Number(data.stock_quantity ?? 0)
    }
  };
}
