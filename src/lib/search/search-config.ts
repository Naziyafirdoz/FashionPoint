/**
 * Server-side search configuration (not UI).
 * Extend these rules when business requirements change — no frontend changes needed.
 */

export type SizeSearchRule = {
  /** Query tokens that activate this rule (lowercase). */
  tokens: string[];
  /** Product sizes that count as an exact match. */
  exactSizes: string[];
  /** Sizes to include when exact matches are absent or as secondary matches. */
  fallbackSizes?: string[];
};

export const SIZE_SEARCH_RULES: SizeSearchRule[] = [
  {
    tokens: ["xl"],
    exactSizes: ["XL"],
    fallbackSizes: ["Jumbo"]
  },
  {
    tokens: ["xxl", "2xl"],
    exactSizes: ["XXL", "2XL"],
    fallbackSizes: ["Jumbo"]
  },
  {
    tokens: ["3xl", "xxxl"],
    exactSizes: ["3XL", "XXXL"],
    fallbackSizes: ["Jumbo"]
  },
  {
    tokens: ["4xl", "xxxxl"],
    exactSizes: ["4XL", "XXXXL"],
    fallbackSizes: ["Jumbo"]
  },
  {
    tokens: ["free size", "freesize", "free-size"],
    exactSizes: ["Free Size"]
  },
  {
    tokens: ["jumbo"],
    exactSizes: ["Jumbo"]
  }
];

/**
 * Maps a family search term to additional substrings found in real product color names.
 * New shades still match via substring (e.g. "Olive Green" contains "green").
 */
export const COLOR_FAMILY_SYNONYMS: Record<string, string[]> = {
  maroon: ["maroon", "wine", "burgundy"],
  red: ["red", "crimson", "scarlet"],
  green: ["green", "mehendi", "emerald", "mint", "olive", "forest", "parrot", "bottle", "sea"],
  blue: ["blue", "navy", "royal", "sky", "peacock", "aqua", "turquoise", "teal"],
  pink: ["pink", "blush", "rose", "magenta"],
  gold: ["gold", "golden", "zari"],
  silver: ["silver", "grey", "gray"],
  purple: ["purple", "violet", "lavender", "lilac"],
  cream: ["cream", "ivory", "off-white", "off white"],
  black: ["black"],
  white: ["white"],
  beige: ["beige", "sand", "nude"]
};

export const SEARCH_SCORE = {
  exactName: 1000,
  nameContains: 800,
  nameWordPrefix: 700,
  category: 600,
  subCategory: 550,
  colorExact: 520,
  colorFamily: 480,
  fabric: 400,
  occasion: 350,
  sizeExact: 320,
  sizeFallback: 160,
  neck: 280,
  sleeve: 280,
  closure: 260,
  tag: 250,
  sku: 220,
  description: 100,
  genericAttribute: 180
} as const;

export const SEARCH_INDEX_CACHE_TTL_MS = 60_000;
export const SEARCH_SUGGESTION_LIMIT = 8;
export const SEARCH_DEFAULT_PRODUCT_LIMIT = 48;
