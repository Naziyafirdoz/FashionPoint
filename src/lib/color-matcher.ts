import {
  blouseHexForName,
  buildAnalysisSummary,
  type ColorAnalysisSummary,
  type DetectedColor
} from "@/lib/color-analysis";
import { slugify } from "@/lib/product-filters";
import {
  canGenerateHarmonyRecommendations,
  COLOR_MATCH_LOW_CONFIDENCE_MESSAGE,
  generateHarmonyRecommendations
} from "@/lib/color-matcher-harmony";

export type MatchType =
  | "DIRECT MATCH"
  | "CONTRAST MATCH"
  | "DESIGNER MATCH"
  | "TRADITIONAL MATCH";

export type BlouseColorRecommendation = {
  rank: number;
  name: string;
  slug: string;
  hex: string;
  matchPercent: number;
  matchType: MatchType;
  reason: string;
  productCount: number;
  shopUrl: string;
};

export type ColorMatchAnalysis = {
  summary: ColorAnalysisSummary;
  detectedColors: DetectedColor[];
  recommendations: BlouseColorRecommendation[];
};

export { COLOR_MATCH_LOW_CONFIDENCE_MESSAGE, canGenerateHarmonyRecommendations };

/**
 * Generates blouse color suggestions from detected saree palette using color-harmony
 * scoring (complementary, analogous, neutral, zari/accent echo). Outputs adapt per upload.
 */
export function generateBlouseRecommendations(
  detectedColors: DetectedColor[]
): Omit<BlouseColorRecommendation, "productCount" | "shopUrl">[] {
  const harmonyResults = generateHarmonyRecommendations(detectedColors);

  return harmonyResults.map((entry, index) => ({
    rank: index + 1,
    name: entry.name,
    slug: slugify(entry.name),
    hex: blouseHexForName(entry.name),
    matchPercent: entry.matchPercent,
    matchType: entry.matchType,
    reason: entry.reason
  }));
}

export function buildColorMatchAnalysis(
  detectedColors: DetectedColor[],
  recommendations: BlouseColorRecommendation[]
): ColorMatchAnalysis {
  return {
    summary: buildAnalysisSummary(detectedColors),
    detectedColors,
    recommendations
  };
}
