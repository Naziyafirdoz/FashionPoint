import type { DetectedColor } from "@/lib/color-analysis";
import type { BlouseColorRecommendation } from "@/lib/color-matcher";
import { buildPaletteInsights } from "@/lib/color-palette-insights";

export type StructuredStyleTips = {
  jewellery: string | null;
  occasions: string[];
  avoid: string[];
  notes: string[];
};

/**
 * UI-only styling tips derived from detected palette and recommendation copy.
 * Does not alter recommendation scoring or business rules.
 */
export function buildStructuredStyleTips(
  detectedColors: DetectedColor[],
  recommendations: BlouseColorRecommendation[]
): StructuredStyleTips {
  const border = detectedColors.find((color) => color.role === "secondary" && !color.uncertain);
  const borderName = border?.name.toLowerCase() ?? "";

  let jewellery: string | null = null;
  if (borderName.includes("gold")) jewellery = "Gold";
  else if (borderName.includes("silver")) jewellery = "Silver";
  else if (borderName.includes("rose gold")) jewellery = "Rose Gold";
  else if (borderName.includes("copper")) jewellery = "Copper";

  const occasions = new Set<string>();
  const combinedReasons = recommendations
    .slice(0, 3)
    .map((rec) => rec.reason.toLowerCase())
    .join(" ");

  if (/wedding|bridal|ceremony/.test(combinedReasons)) occasions.add("Wedding");
  if (/reception|evening/.test(combinedReasons)) occasions.add("Reception");
  if (/festive|festival|puja|celebration/.test(combinedReasons)) occasions.add("Festival");
  if (/office|work|daily|everyday/.test(combinedReasons)) occasions.add("Office");

  const notes = buildPaletteInsights(detectedColors).slice(0, 1);
  const avoid = recommendations.length > 0 ? ["Bright neon colors"] : [];

  return {
    jewellery,
    occasions: [...occasions],
    avoid,
    notes
  };
}

/** @deprecated Use buildStructuredStyleTips — kept for backward compatibility */
export function buildColorMatcherStyleTips(
  detectedColors: DetectedColor[],
  recommendations: BlouseColorRecommendation[]
): string[] {
  const structured = buildStructuredStyleTips(detectedColors, recommendations);
  const tips: string[] = [];
  if (structured.jewellery) tips.push(`Best jewellery: ${structured.jewellery}`);
  if (structured.occasions.length) tips.push(`Occasion: ${structured.occasions.join(", ")}`);
  tips.push(...structured.notes);
  return tips.slice(0, 5);
}

export function getRecommendationOccasionTag(
  recommendation: BlouseColorRecommendation
): string | null {
  const reason = recommendation.reason.toLowerCase();

  if (/wedding|bridal|ceremony|festive|festival|puja/.test(reason)) {
    return "Party";
  }
  if (/office|daily|everyday|casual/.test(reason)) {
    return "Daily Wear";
  }
  if (
    recommendation.matchType === "DESIGNER MATCH" ||
    /evening|premium|designer|reception|statement/.test(reason)
  ) {
    return "Premium";
  }
  if (recommendation.matchType === "TRADITIONAL MATCH") {
    return "Party";
  }
  if (recommendation.matchType === "CONTRAST MATCH") {
    return "Daily Wear";
  }
  return recommendation.matchType === "DIRECT MATCH" ? "Premium" : null;
}
