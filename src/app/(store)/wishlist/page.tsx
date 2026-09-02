import { createClient } from "@/lib/supabase/server";
import { getProductBySlugFromDb } from "@/lib/products/get-by-slug";
import { getWishlistRecommendations } from "@/lib/wishlist/get-recommendations";
import { devLog } from "@/lib/dev-log";
import {
  WishlistPageClient,
  type WishlistInitialItem
} from "@/components/wishlist/WishlistPageClient";
import type { Product } from "@/types";

export const metadata = { title: "Wishlist" };

export default async function WishlistPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return <WishlistPageClient initialItems={[]} recommendedProducts={[]} />;
  }

  try {
    const { data: items, error } = await supabase
      .from("wishlist")
      .select("id, product_id, created_at, products(id, name, slug, price, images)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    devLog("[wishlist] page fetch", {
      userId: user.id,
      rowCount: items?.length ?? 0,
      error
    });

    const initialItems: WishlistInitialItem[] = [];

    for (const item of items ?? []) {
      const raw = item.products;
      const product = (Array.isArray(raw) ? raw[0] : raw) as {
        id: string;
        slug: string;
      } | null;

      let slug = product?.slug;

      if (!slug && item.product_id) {
        const { data: productRow } = await supabase
          .from("products")
          .select("slug")
          .eq("id", item.product_id)
          .maybeSingle();
        slug = productRow?.slug ?? undefined;
      }

      if (!slug) continue;

      initialItems.push({
        wishlistId: item.id,
        productId: item.product_id,
        createdAt: item.created_at,
        slug
      });
    }

    devLog("[wishlist] page hydrated items", {
      userId: user.id,
      initialItems
    });

    const wishlistProductIds = new Set(initialItems.map((item) => item.productId));
    const wishlistProducts = (
      await Promise.all(initialItems.map((item) => getProductBySlugFromDb(item.slug)))
    ).filter((product): product is Product => product !== null);

    const recommendedProducts = await getWishlistRecommendations(
      wishlistProducts,
      wishlistProductIds
    );

    return (
      <WishlistPageClient
        initialItems={initialItems}
        recommendedProducts={recommendedProducts}
      />
    );
  } catch (error) {
    devLog("[wishlist] page load failed", { userId: user.id, error });
    return <WishlistPageClient initialItems={[]} recommendedProducts={[]} />;
  }
}
