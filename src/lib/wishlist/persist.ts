import { createClient } from "@/lib/supabase/client";
import { devLog } from "@/lib/dev-log";

export async function fetchWishlistProductIds(): Promise<string[]> {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    devLog("[wishlist] fetch skipped — no authenticated user");
    return [];
  }

  const { data, error } = await supabase
    .from("wishlist")
    .select("product_id")
    .eq("user_id", user.id);

  devLog("[wishlist] fetch", {
    userId: user.id,
    rows: data,
    error
  });

  if (error || !data) return [];

  return data.map((row) => String(row.product_id));
}

export async function insertWishlistItem(productId: string): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    devLog("[wishlist] insert skipped — no authenticated user", { productId });
    return false;
  }

  const { data, error } = await supabase
    .from("wishlist")
    .insert({ user_id: user.id, product_id: productId })
    .select("id, user_id, product_id, created_at")
    .single();

  devLog("[wishlist] insert", {
    row: data,
    productId,
    userId: user.id,
    error
  });

  if (error) {
    if (error.code === "23505") {
      return true;
    }
    return false;
  }

  return true;
}

export async function deleteWishlistItem(productId: string): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    devLog("[wishlist] delete skipped — no authenticated user", { productId });
    return false;
  }

  const { error } = await supabase
    .from("wishlist")
    .delete()
    .eq("user_id", user.id)
    .eq("product_id", productId);

  devLog("[wishlist] delete", {
    productId,
    userId: user.id,
    error
  });

  return !error;
}
