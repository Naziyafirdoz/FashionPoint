import { createServiceClient } from "@/lib/supabase";
import type { Category } from "@/types";

export async function getActiveCategories(): Promise<Category[]> {
  const db = createServiceClient();
  if (!db) return [];

  const { data, error } = await db
    .from("categories")
    .select("id, name, slug, sort_order, is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    sort_order: Number(row.sort_order ?? 0),
    is_active: Boolean(row.is_active)
  }));
}
