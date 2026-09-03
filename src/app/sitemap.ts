import type { MetadataRoute } from "next";
import { getActiveCategories } from "@/lib/categories/get-categories";
import { SITE_URL } from "@/lib/site-config";
import { createServiceClient } from "@/lib/supabase";

function siteBase(): string {
  return SITE_URL.replace(/\/$/, "");
}

const STATIC_PATHS: Array<{ path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/products", changeFrequency: "weekly", priority: 0.9 },
  { path: "/ai-features", changeFrequency: "weekly", priority: 0.8 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.7 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.6 },
  { path: "/about", changeFrequency: "monthly", priority: 0.6 },
  { path: "/size-guide", changeFrequency: "monthly", priority: 0.6 },
  { path: "/privacy-policy", changeFrequency: "monthly", priority: 0.5 },
  { path: "/terms-and-conditions", changeFrequency: "monthly", priority: 0.5 },
  { path: "/shipping-policy", changeFrequency: "monthly", priority: 0.5 },
  { path: "/return-policy", changeFrequency: "monthly", priority: 0.5 }
];

async function productSlugs(): Promise<string[]> {
  const db = createServiceClient();
  if (!db) return [];

  const { data, error } = await db
    .from("products")
    .select("slug")
    .eq("status", "active")
    .limit(2000);

  if (error || !data) return [];
  return data
    .map((row) => String(row.slug ?? "").trim())
    .filter(Boolean);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteBase();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((entry) => ({
    url: `${base}${entry.path}`,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority
  }));

  const [categories, slugs] = await Promise.all([getActiveCategories(), productSlugs()]);

  const categoryEntries: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${base}/${category.slug}`,
    changeFrequency: "weekly",
    priority: 0.8
  }));

  const productEntries: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: `${base}/product/${encodeURIComponent(slug)}`,
    changeFrequency: "weekly",
    priority: 0.7
  }));

  return [...staticEntries, ...categoryEntries, ...productEntries];
}
