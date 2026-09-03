import { unstable_cache } from "next/cache";
import { createServiceClient } from "@/lib/supabase";
import {
  parseHomepageHeroCampaignRow,
  type HomepageHeroCampaign,
  type HomepageHeroCampaignRow
} from "@/lib/campaigns/homepage-hero-campaign";

export const HOMEPAGE_HERO_CAMPAIGN_CACHE_TAG = "homepage-hero-campaign";

export type { HomepageHeroCampaign, HomepageHeroDisplayMode } from "@/lib/campaigns/homepage-hero-campaign";
export { parseHomepageHeroCampaignRow, isSafeInternalCtaUrl } from "@/lib/campaigns/homepage-hero-campaign";

async function fetchActiveHomepageHeroCampaign(): Promise<HomepageHeroCampaign | null> {
  try {
    const db = createServiceClient();
    if (!db) return null;

    const now = new Date();
    const nowIso = now.toISOString();

    const { data, error } = await db
      .from("homepage_hero_campaigns")
      .select(
        "id, name, occasion, display_mode, is_enabled, hero_image_url, mobile_image_url, heading, subheading, offer_text, cta_text, cta_url, content_style, starts_at, ends_at, priority"
      )
      .eq("is_enabled", true)
      .lte("starts_at", nowIso)
      .gte("ends_at", nowIso)
      .order("priority", { ascending: false })
      .order("starts_at", { ascending: false })
      .order("id", { ascending: true })
      .limit(20);

    if (error || !data?.length) return null;

    for (const row of data as HomepageHeroCampaignRow[]) {
      const parsed = parseHomepageHeroCampaignRow(row, now);
      if (parsed) return parsed;
    }

    return null;
  } catch {
    return null;
  }
}

export const getActiveHomepageHeroCampaign = unstable_cache(
  fetchActiveHomepageHeroCampaign,
  ["homepage-hero-campaign"],
  {
    tags: [HOMEPAGE_HERO_CAMPAIGN_CACHE_TAG],
    revalidate: 60
  }
);
