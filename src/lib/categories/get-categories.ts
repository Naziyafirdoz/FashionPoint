import { cache } from "react";
import { createServiceClient } from "@/lib/supabase";
import type { Category } from "@/types";

export type HomepageCategoryRecord = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  homepage_banner_image_url?: string;
  homepage_display_order: number;
  theme: string;
  button_text: string;
};

type DbHomepageCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  homepage_description: string | null;
  homepage_display_order: number | null;
  homepage_theme: string | null;
  homepage_button_text: string | null;
  homepage_banner_image_url: string | null;
};

export const getActiveCategories = cache(async (): Promise<Category[]> => {
  const db = createServiceClient();
  if (!db) return [];

  const { data, error } = await db
    .from("categories")
    .select("id, name, slug, sort_order, is_active, show_in_navbar, navbar_position")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    sort_order: Number(row.sort_order ?? 0),
    is_active: Boolean(row.is_active),
    show_in_navbar: Boolean(row.show_in_navbar),
    navbar_position: row.navbar_position != null ? Number(row.navbar_position) : null
  }));
});

export const getHomepageCategories = cache(async (): Promise<HomepageCategoryRecord[]> => {
  const db = createServiceClient();
  if (!db) return [];

  const { data, error } = await db
    .from("categories")
    .select(
      `
      id,
      name,
      slug,
      description,
      image_url,
      homepage_description,
      homepage_display_order,
      homepage_theme,
      homepage_button_text,
      homepage_banner_image_url
    `
    )
    .eq("is_active", true)
    .eq("show_on_homepage", true)
    .order("homepage_display_order", { ascending: true });

  if (error || !data) return [];

  return (data as DbHomepageCategory[]).map((row) => {
    const homepageDescription = row.homepage_description?.trim();
    const categoryDescription = row.description?.trim();
    const homepageBanner = row.homepage_banner_image_url?.trim();
    const categoryImage = row.image_url?.trim();

    return {
      id: String(row.id),
      name: String(row.name),
      slug: String(row.slug),
      description: homepageDescription || categoryDescription || undefined,
      image_url: categoryImage || undefined,
      homepage_banner_image_url: homepageBanner || undefined,
      homepage_display_order: Number(row.homepage_display_order ?? 0),
      theme: row.homepage_theme?.trim() || "blush",
      button_text: row.homepage_button_text?.trim() || "View Collection"
    };
  });
});
