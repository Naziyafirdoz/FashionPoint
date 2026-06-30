import { colorMatchesFilter } from "@/lib/product-filters";
import { COLOR_FAMILY_SYNONYMS } from "@/lib/search/search-config";
import { partialMatch } from "@/lib/search/tokenize-query";

export type ColorMatchStrength = "none" | "family" | "exact";

function collectColorNeedles(token: string): string[] {
  const needles = new Set<string>([token]);
  const familyKey = Object.keys(COLOR_FAMILY_SYNONYMS).find(
    (key) => key === token || partialMatch(key, token) || partialMatch(token, key)
  );

  if (familyKey) {
    COLOR_FAMILY_SYNONYMS[familyKey].forEach((synonym) => needles.add(synonym));
    needles.add(familyKey);
  }

  for (const [family, synonyms] of Object.entries(COLOR_FAMILY_SYNONYMS)) {
    if (synonyms.some((synonym) => partialMatch(synonym, token) || partialMatch(token, synonym))) {
      needles.add(family);
      synonyms.forEach((synonym) => needles.add(synonym));
    }
  }

  return [...needles];
}

export function matchProductColor(
  productColors: string[],
  token: string
): ColorMatchStrength {
  const normalizedToken = token.toLowerCase().trim();
  if (!normalizedToken) return "none";

  for (const color of productColors) {
    const normalizedColor = color.toLowerCase().trim();
    if (!normalizedColor) continue;

    if (normalizedColor === normalizedToken) return "exact";
    if (partialMatch(normalizedColor, normalizedToken)) return "family";
    if (colorMatchesFilter(color, normalizedToken)) return "family";
  }

  const needles = collectColorNeedles(normalizedToken);
  for (const color of productColors) {
    const normalizedColor = color.toLowerCase();
    if (needles.some((needle) => partialMatch(normalizedColor, needle))) {
      return "family";
    }
  }

  return "none";
}
