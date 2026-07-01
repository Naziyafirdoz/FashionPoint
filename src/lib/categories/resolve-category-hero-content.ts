import type { CategoryPageData } from "@/types";

export type CategoryHeroFeatureLines = {
  lines: string[];
};

export type ResolvedCategoryHeroContent = {
  title: string;
  description: string;
  ctaLabel: string;
  badge: string | null;
  features: CategoryHeroFeatureLines[] | null;
};

type HeroContentSource = Pick<
  CategoryPageData,
  "name" | "slug" | "description" | "hero_subtitle" | "cta_label"
>;

type CategoryTone =
  | "embroidered"
  | "designer"
  | "party"
  | "daily"
  | "traditional"
  | "festive"
  | "general";

function normalizeText(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function buildSearchText(name: string, slug: string): string {
  return `${name} ${slug}`.toLowerCase();
}

function detectCategoryTone(searchText: string): CategoryTone {
  if (/embroider|zari|sequin|thread[\s-]?work|mirror[\s-]?work|bead|stone[\s-]?work/.test(searchText)) {
    return "embroidered";
  }
  if (/kalamkari|block[\s-]?print|hand[\s-]?paint|traditional|heritage|ethnic|craft/.test(searchText)) {
    return "traditional";
  }
  if (/festive|festival|diwali|wedding|celebration|occasion/.test(searchText)) {
    return "festive";
  }
  if (/party|evening|glam|cocktail/.test(searchText)) {
    return "party";
  }
  if (/designer|luxury|premium|couture/.test(searchText)) {
    return "designer";
  }
  if (/daily|everyday|casual|office|comfort/.test(searchText)) {
    return "daily";
  }
  return "general";
}

function formatCollectionLabel(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "collection";
  if (/\bblouses?\b/i.test(trimmed)) return trimmed.toLowerCase();
  return `${trimmed.toLowerCase()} blouses`;
}

function generateHeroDescription(name: string, slug: string): string {
  const searchText = buildSearchText(name, slug);
  const tone = detectCategoryTone(searchText);
  const collection = formatCollectionLabel(name);

  switch (tone) {
    case "embroidered":
      return `Discover beautifully crafted ${collection} featuring intricate thread work, zari accents, sequins, and refined detailing for festive and traditional occasions.`;
    case "traditional":
      return `Explore artfully made ${collection} with heritage-inspired motifs, graceful silhouettes, and premium finishes designed for timeless Indian elegance.`;
    case "festive":
      return `Find statement ${collection} created for celebrations—rich textures, polished tailoring, and elegant details that elevate every festive moment.`;
    case "party":
      return `Shop striking ${collection} made to stand out—polished fits, luminous accents, and confident style for parties and special evenings.`;
    case "designer":
      return `Experience designer ${collection} with elevated cuts, luxe fabrics, and meticulous finishing for a premium ready-made wardrobe.`;
    case "daily":
      return `Browse comfortable ${collection} designed for everyday elegance—lightweight fabrics, easy fits, and effortless style from morning to evening.`;
    default:
      return `Explore our curated ${collection} of premium ready-made pieces, thoughtfully tailored for comfort, quality, and lasting style.`;
  }
}

function stripTrailingBlouses(name: string): string {
  return name.replace(/\s+blouses?$/i, "").trim() || name.trim();
}

function generateHeroCtaLabel(name: string, slug: string): string {
  const searchText = buildSearchText(name, slug);
  const tone = detectCategoryTone(searchText);
  const subject = stripTrailingBlouses(name);

  switch (tone) {
    case "embroidered":
    case "traditional":
    case "festive":
      return `Discover ${subject} Collection`;
    case "designer":
      return `Shop ${subject} Blouses`;
    case "party":
    case "daily":
      return `Browse ${subject}`;
    default:
      return `Explore ${subject} Collection`;
  }
}

/**
 * Resolves storefront category hero copy from admin-configured fields with premium fallbacks.
 */
export function resolveCategoryHeroContent(
  category: HeroContentSource
): ResolvedCategoryHeroContent {
  const title = normalizeText(category.name) ?? "Collection";

  const description =
    normalizeText(category.description) ??
    normalizeText(category.hero_subtitle) ??
    generateHeroDescription(title, category.slug);

  const ctaLabel =
    normalizeText(category.cta_label) ?? generateHeroCtaLabel(title, category.slug);

  return {
    title,
    description,
    ctaLabel,
    badge: null,
    features: null
  };
}
