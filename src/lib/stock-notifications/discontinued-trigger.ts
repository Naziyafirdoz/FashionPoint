import type { SupabaseClient } from "@supabase/supabase-js";
import { processDiscontinuedProductNotifications } from "@/lib/stock-notifications/process-discontinued";

export async function getProductCategorySlug(
  db: SupabaseClient,
  categoryId: string | null | undefined
): Promise<string | null> {
  if (!categoryId) return null;

  const { data } = await db
    .from("categories")
    .select("slug")
    .eq("id", categoryId)
    .maybeSingle();

  return data?.slug ?? null;
}

export async function notifyDiscontinuedProductIfNeeded(
  db: SupabaseClient,
  input: {
    productId: string;
    productName: string;
    categoryId?: string | null;
    categorySlug?: string | null;
  }
): Promise<void> {
  const categorySlug =
    input.categorySlug ?? (await getProductCategorySlug(db, input.categoryId));

  await processDiscontinuedProductNotifications(db, {
    productId: input.productId,
    productName: input.productName,
    categorySlug
  });
}
