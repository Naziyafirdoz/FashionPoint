import { parseCampaignContentStyle, type CampaignContentStyle } from "./campaign-hero-content-style";

export type { CampaignContentStyle };

export function isSafeInternalCtaUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return false;
  if (trimmed.startsWith("//")) return false;
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:")) {
    return false;
  }
  return true;
}

export type HomepageHeroDisplayMode = "image_only" | "image_with_content";

export type HomepageHeroCampaign = {
  id: string;
  name: string;
  occasion: string | null;
  displayMode: HomepageHeroDisplayMode;
  heroImageUrl: string;
  mobileImageUrl: string | null;
  heading: string | null;
  subheading: string | null;
  offerText: string | null;
  ctaText: string | null;
  ctaUrl: string | null;
  contentStyle: CampaignContentStyle | null;
};

export type HomepageHeroCampaignRow = {
  id: string;
  name: string;
  occasion: string | null;
  display_mode: string;
  is_enabled: boolean;
  hero_image_url: string;
  mobile_image_url: string | null;
  heading: string | null;
  subheading: string | null;
  offer_text: string | null;
  cta_text: string | null;
  cta_url: string | null;
  content_style?: unknown;
  starts_at: string;
  ends_at: string;
  priority: number;
};

function asTrimmed(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isDisplayMode(value: string): value is HomepageHeroDisplayMode {
  return value === "image_only" || value === "image_with_content";
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function referencesDefaultHeroAssets(value: string): boolean {
  return value.toLowerCase().includes("/assets/hero/");
}

function isValidCampaignImageUrl(value: string): boolean {
  return isHttpUrl(value) && !referencesDefaultHeroAssets(value);
}

function parseOptionalImageUrl(value: unknown): string | null {
  const trimmed = asTrimmed(value);
  if (!trimmed) return null;
  return isValidCampaignImageUrl(trimmed) ? trimmed : null;
}

export function parseHomepageHeroCampaignRow(
  row: HomepageHeroCampaignRow,
  now: Date = new Date()
): HomepageHeroCampaign | null {
  if (!row.is_enabled) return null;
  if (!isDisplayMode(row.display_mode)) return null;

  const name = asTrimmed(row.name);
  const heroImageUrl = asTrimmed(row.hero_image_url);
  if (!name || !heroImageUrl || !isValidCampaignImageUrl(heroImageUrl)) return null;

  const startsAt = new Date(row.starts_at);
  const endsAt = new Date(row.ends_at);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) return null;
  if (!(endsAt.getTime() > startsAt.getTime())) return null;

  const nowMs = now.getTime();
  if (nowMs < startsAt.getTime() || nowMs > endsAt.getTime()) return null;

  const heading = asTrimmed(row.heading);
  if (row.display_mode === "image_with_content" && !heading) return null;

  const ctaText = asTrimmed(row.cta_text);
  const ctaUrl = asTrimmed(row.cta_url);
  if (Boolean(ctaText) !== Boolean(ctaUrl)) return null;
  if (ctaUrl && !isSafeInternalCtaUrl(ctaUrl)) return null;

  const mobileImageUrl = parseOptionalImageUrl(row.mobile_image_url);

  return {
    id: row.id,
    name,
    occasion: asTrimmed(row.occasion),
    displayMode: row.display_mode,
    heroImageUrl,
    mobileImageUrl,
    heading,
    subheading: asTrimmed(row.subheading),
    offerText: asTrimmed(row.offer_text),
    ctaText,
    ctaUrl,
    contentStyle: parseCampaignContentStyle(row.content_style)
  };
}
