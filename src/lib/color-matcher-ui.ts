import type { BlouseColorRecommendation } from "@/lib/color-matcher";

export function shortenExplanation(text: string, maxLength = 96): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;

  const firstSentence = trimmed.match(/^[^.!?]+[.!?]?/)?.[0]?.trim() ?? trimmed;
  if (firstSentence.length <= maxLength) return firstSentence;

  return `${firstSentence.slice(0, maxLength - 1).trim()}…`;
}

export type MatchQualityPresentation = {
  label: string;
  stars: number;
  helperText: string;
};

/**
 * Maps rule-based pairing scores to stylist-friendly labels.
 * Scores come from pairing profiles — not raw AI confidence — so we avoid exact % display.
 */
export function getMatchQualityPresentation(
  matchPercent: number,
  rank: number
): MatchQualityPresentation {
  if (rank === 1 || matchPercent >= 93) {
    return {
      label: "Excellent Match",
      stars: 5,
      helperText: "Strong pairing with your detected saree colors"
    };
  }
  if (rank === 2 || matchPercent >= 86) {
    return {
      label: "Very Good Match",
      stars: 4,
      helperText: "Works well with your saree palette"
    };
  }
  return {
    label: "Good Match",
    stars: 3,
    helperText: "A complementary styling option"
  };
}

/** UI-only occasion labels derived from existing recommendation copy and match type. */
export function getRecommendationOccasionTags(
  recommendation: BlouseColorRecommendation
): string[] {
  const tags = new Set<string>();
  const reason = recommendation.reason.toLowerCase();

  if (/wedding|bridal|ceremony/.test(reason)) tags.add("Wedding");
  if (/festive|festival|puja|celebration/.test(reason)) tags.add("Festival");
  if (/reception|evening/.test(reason)) tags.add("Reception");
  if (/office|work/.test(reason)) tags.add("Office");
  if (/daily|everyday|casual|daytime/.test(reason)) tags.add("Daily Wear");
  if (/party/.test(reason)) tags.add("Party");
  if (
    recommendation.matchType === "DESIGNER MATCH" ||
    /designer|statement|premium/.test(reason)
  ) {
    tags.add("Designer");
  }

  if (tags.size === 0) {
    if (recommendation.matchType === "TRADITIONAL MATCH") tags.add("Festival");
    else if (recommendation.matchType === "CONTRAST MATCH") tags.add("Daily Wear");
    else if (recommendation.matchType === "DIRECT MATCH") tags.add("Wedding");
  }

  return [...tags].slice(0, 3);
}
