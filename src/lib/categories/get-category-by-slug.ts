import { cache } from "react";
import { createServiceClient } from "@/lib/supabase";
import type { Category } from "@/types";

export const getCategoryBySlug = cache(async (slug: string): Promise<Category | null> => {
  const db = createServiceClient();
  if (!db) return null;

  const { data, error } = await db
    .from("categories")
    .select(
      "id, name, slug, description, image_url, sort_order, is_active, show_in_navbar, navbar_position"
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: String(data.id),
    name: String(data.name),
    slug: String(data.slug),
    description: data.description != null ? String(data.description) : undefined,
    image_url: data.image_url != null ? String(data.image_url) : undefined,
    sort_order: Number(data.sort_order ?? 0),
    is_active: Boolean(data.is_active),
    show_in_navbar: Boolean(data.show_in_navbar),
    navbar_position: data.navbar_position != null ? Number(data.navbar_position) : null
  };
});
