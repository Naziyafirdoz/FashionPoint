import { colorMatchesFilter } from "@/lib/product-filters";
import type { CatalogVocabulary, StylistIntent, StylistSessionFilters } from "@/lib/stylist-assistant/types";

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function includesMatch(haystack: string, needle: string): boolean {
  const h = normalize(haystack);
  const n = normalize(needle);
  return h.includes(n) || n.includes(h);
}

function parseBudget(message: string): number | undefined {
  const patterns = [
    /(?:under|below|upto|up to|max|budget)\s*₹?\s*([\d,]+)/i,
    /₹\s*([\d,]+)/i,
    /([\d,]+)\s*(?:rs|inr)/i
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (!match?.[1]) continue;
    const value = Number(match[1].replace(/,/g, ""));
    if (Number.isFinite(value) && value > 0) return value;
  }

  return undefined;
}

function findVocabularyMatch(message: string, options: string[]): string | undefined {
  const lower = message.toLowerCase();
  const sorted = [...options].sort((a, b) => b.length - a.length);

  for (const option of sorted) {
    if (includesMatch(lower, option.toLowerCase())) {
      return option;
    }
  }

  return undefined;
}

function findColorMatch(message: string, colors: string[]): string | undefined {
  const lower = message.toLowerCase();
  const colorAliases = [
    "blue",
    "navy",
    "red",
    "maroon",
    "wine",
    "pink",
    "gold",
    "silver",
    "green",
    "purple",
    "black",
    "white",
    "cream",
    "beige",
    "orange",
    "yellow",
    "brown"
  ];

  for (const alias of colorAliases) {
    if (!lower.includes(alias)) continue;
    const catalogMatch = colors.find((color) => colorMatchesFilter(color, alias));
    if (catalogMatch) return catalogMatch;
  }

  return findVocabularyMatch(message, colors);
}

const OCCASION_ALIASES: Record<string, string[]> = {
  wedding: ["wedding", "bridal", "bride", "marriage"],
  party: ["party", "party wear"],
  festive: ["festive", "festival", "puja", "diwali"],
  office: ["office", "work", "formal"],
  daily: ["daily", "everyday", "casual"],
  reception: ["reception"],
  engagement: ["engagement"],
  mehendi: ["mehendi", "mehndi"]
};

function findOccasionMatch(message: string, occasions: string[]): string | undefined {
  const lower = message.toLowerCase();

  for (const [key, aliases] of Object.entries(OCCASION_ALIASES)) {
    if (!aliases.some((alias) => lower.includes(alias))) continue;
    const catalogMatch = occasions.find((occasion) => includesMatch(occasion, key));
    if (catalogMatch) return catalogMatch;
  }

  return findVocabularyMatch(message, occasions);
}

function findTagMatch(message: string, tags: string[]): string | undefined {
  const lower = message.toLowerCase();
  const keywords = ["embroidered", "embroidery", "zari", "designer", "sequin", "mirror"];

  for (const keyword of keywords) {
    if (!lower.includes(keyword)) continue;
    const catalogMatch = tags.find((tag) => includesMatch(tag, keyword));
    if (catalogMatch) return catalogMatch;
  }

  return findVocabularyMatch(message, tags);
}

export function detectIntent(message: string): StylistIntent {
  const lower = message.toLowerCase();

  if (
    /capital of|weather in|who is the president|javascript tutorial|write a poem|solve this math/.test(
      lower
    )
  ) {
    return "unsupported";
  }

  if (/shipping|delivery|dispatch|courier|track order/.test(lower)) {
    return "shipping_policy";
  }

  if (/return|refund|exchange/.test(lower)) {
    return "return_policy";
  }

  if (/new arrival|new arrivals|latest blouse|new collection/.test(lower)) {
    return "new_arrivals";
  }

  if (/best seller|bestseller|best selling|top selling|popular blouse/.test(lower)) {
    return "bestsellers";
  }

  if (/what fabric|explain fabric|tell me about .*fabric/.test(lower)) {
    return "explain_fabric";
  }

  if (/what categories|show categories|collections available/.test(lower)) {
    return "list_categories";
  }

  return "product_search";
}

export function extractFiltersFromMessage(
  message: string,
  vocabulary: CatalogVocabulary
): Partial<StylistSessionFilters> {
  const extracted: Partial<StylistSessionFilters> = {};
  const budget = parseBudget(message);
  if (budget) extracted.budgetMax = budget;

  const color = findColorMatch(message, vocabulary.colors);
  if (color) extracted.color = color;

  const occasion = findOccasionMatch(message, vocabulary.occasions);
  if (occasion) extracted.occasion = occasion;

  const fabric = findVocabularyMatch(message, vocabulary.fabrics);
  if (fabric) extracted.fabric = fabric;

  const neck = findVocabularyMatch(message, vocabulary.necks);
  if (neck) extracted.neck = neck;

  const sleeve = findVocabularyMatch(message, vocabulary.sleeves);
  if (sleeve) extracted.sleeve = sleeve;

  const category = findVocabularyMatch(message, vocabulary.categories);
  if (category) extracted.category = category;

  const size = findVocabularyMatch(message, vocabulary.sizes);
  if (size) extracted.size = size;

  const tag = findTagMatch(message, vocabulary.tags);
  if (tag) extracted.tag = tag;

  return extracted;
}

export function mergeSessionFilters(
  current: StylistSessionFilters,
  extracted: Partial<StylistSessionFilters>,
  intent: StylistIntent
): StylistSessionFilters {
  const merged: StylistSessionFilters = { ...current, ...extracted, inStockOnly: true };

  if (intent === "new_arrivals") {
    merged.sort = "new";
  } else if (intent === "bestsellers") {
    merged.sort = "bestseller";
  }

  return merged;
}

export function applyQuickChipFilters(chipMessage: string): Partial<StylistSessionFilters> {
  const lower = chipMessage.toLowerCase();

  if (lower.includes("wedding") && lower.includes("2000")) {
    return { occasion: "Wedding", budgetMax: 2000 };
  }
  if (lower.includes("blue") && lower.includes("embroidered")) {
    return { color: "Blue", tag: "embroidered" };
  }
  if (lower.includes("party wear")) {
    return { occasion: "Party" };
  }
  if (lower.includes("cotton") && lower.includes("daily")) {
    return { fabric: "Cotton", occasion: "Daily" };
  }
  if (lower.includes("new arrivals")) {
    return { sort: "new" };
  }
  if (lower.includes("best selling")) {
    return { sort: "bestseller" };
  }
  if (lower.includes("1500")) {
    return { budgetMax: 1500 };
  }

  return {};
}
