import {
  blouseHexForName,
  hexToRgb,
  type DetectedColor,
  type Rgb
} from "@/lib/color-analysis";

export type HarmonyMatchType =
  | "DIRECT MATCH"
  | "CONTRAST MATCH"
  | "DESIGNER MATCH"
  | "TRADITIONAL MATCH";

export const COLOR_MATCH_LOW_CONFIDENCE_MESSAGE =
  "We couldn't confidently identify the saree colors. Please upload a clearer image.";

const MIN_PRIMARY_CONFIDENCE = 55;

/** Blouse colors available for catalog slug matching — not per-saree recommendation lists. */
const BLOUSE_COLOR_RGB: Record<string, Rgb> = {
  Gold: { r: 212, g: 175, b: 55 },
  Silver: { r: 192, g: 192, b: 192 },
  Maroon: { r: 127, g: 29, b: 29 },
  Wine: { r: 114, g: 47, b: 55 },
  Cream: { r: 255, g: 251, b: 235 },
  Beige: { r: 214, g: 188, b: 150 },
  Black: { r: 23, g: 23, b: 23 },
  Red: { r: 185, g: 28, b: 28 },
  Pink: { r: 236, g: 72, b: 153 },
  "Magenta Pink": { r: 219, g: 39, b: 119 },
  "Emerald Green": { r: 5, g: 150, b: 105 },
  Green: { r: 22, g: 163, b: 74 },
  "Navy Blue": { r: 0, g: 31, b: 91 },
  "Royal Navy Blue": { r: 25, g: 55, b: 120 },
  Purple: { r: 126, g: 34, b: 206 },
  Brown: { r: 120, g: 53, b: 15 },
  Mustard: { r: 218, g: 165, b: 32 },
  White: { r: 250, g: 250, b: 250 }
};

const NEUTRAL_BLOUSE_NAMES = new Set(["Cream", "Beige", "White", "Black", "Brown"]);

type HarmonyKind =
  | "zari"
  | "accent"
  | "complementary"
  | "analogous"
  | "neutral"
  | "traditional"
  | "monochromatic";

type ScoredCandidate = {
  name: string;
  rgb: Rgb;
  score: number;
  matchType: HarmonyMatchType;
  harmony: HarmonyKind;
};

function colorDistance(a: Rgb, b: Rgb): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

function rgbToHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
        break;
      case gn:
        h = ((bn - rn) / d + 2) / 6;
        break;
      default:
        h = ((rn - gn) / d + 4) / 6;
    }
  }

  return { h: h * 360, s, l };
}

function hueDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function isNeutralBlouse(name: string): boolean {
  return NEUTRAL_BLOUSE_NAMES.has(name);
}

function isCoolRgb(rgb: Rgb): boolean {
  return rgb.b > rgb.r + 12 && rgb.b >= rgb.g - 8;
}

function isWarmRgb(rgb: Rgb): boolean {
  return rgb.r > rgb.b + 12 && rgb.r >= rgb.g - 20;
}

function isZariLike(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes("zari") || n.includes("gold") || n.includes("silver") || n.includes("copper");
}

function blouseFromZari(name: string): string | null {
  const n = name.toLowerCase();
  if (n.includes("silver")) return "Silver";
  if (n.includes("gold") || n.includes("copper") || n.includes("rose gold")) return "Gold";
  return null;
}

function isFabricEcho(blouseName: string, primaryName: string): boolean {
  const blouse = blouseName.toLowerCase();
  const fabric = primaryName.toLowerCase();

  if (blouse === fabric) return true;
  if (fabric.includes("navy") && blouse.includes("navy")) return true;
  if (fabric.includes("rich red") && blouse === "red") return true;
  if (fabric.includes("emerald") && blouse.includes("emerald")) return true;
  if (fabric.includes("green") && blouse === "green" && !fabric.includes("emerald")) return true;

  return false;
}

function buildReason(
  blouseName: string,
  harmony: HarmonyKind,
  primary: DetectedColor,
  border: DetectedColor | null,
  accent: DetectedColor | null
): string {
  switch (harmony) {
    case "zari":
      return `Matches the ${border?.name ?? accent?.name ?? "metallic accents"} detected in your uploaded saree.`;
    case "accent":
      return `Echoes the ${accent?.name ?? blouseName} accent tones found in your saree.`;
    case "complementary":
      return `Creates rich contrast with ${primary.name} while maintaining an elegant look.`;
    case "analogous":
      return `Harmonizes with the ${primary.name} body for a cohesive, refined appearance.`;
    case "neutral":
      return `Balances the ${primary.name} saree with a soft neutral blouse tone.`;
    case "traditional":
      return `Traditional festive pairing that complements your ${primary.name} saree.`;
    case "monochromatic":
      return `Subtle tonal styling that stays close to your ${primary.name} palette.`;
    default:
      return `Complements the detected ${primary.name} saree colors.`;
  }
}

function scoreBlouseColor(
  blouseName: string,
  blouseRgb: Rgb,
  primary: DetectedColor,
  border: DetectedColor | null,
  accent: DetectedColor | null
): ScoredCandidate | null {
  if (isFabricEcho(blouseName, primary.name)) return null;

  const primaryHsl = rgbToHsl(primary.rgb);
  const blouseHsl = rgbToHsl(blouseRgb);
  const hueDiff = hueDistance(primaryHsl.h, blouseHsl.h);
  const rgbDist = colorDistance(primary.rgb, blouseRgb);

  if (rgbDist < 35) return null;

  let score = 0;
  let matchType: HarmonyMatchType = "CONTRAST MATCH";
  let harmony: HarmonyKind = "complementary";

  if (border && !border.uncertain) {
    const zariBlouse = blouseFromZari(border.name);
    if (zariBlouse && zariBlouse === blouseName) {
      return {
        name: blouseName,
        rgb: blouseRgb,
        score: 96 + Math.min(3, Math.round(border.confidence / 40)),
        matchType: "DIRECT MATCH",
        harmony: "zari"
      };
    }
  }

  if (accent && !accent.uncertain) {
    const accentBlouse = blouseFromZari(accent.name);
    if (accentBlouse === blouseName) {
      return {
        name: blouseName,
        rgb: blouseRgb,
        score: 92 + Math.min(3, Math.round(accent.confidence / 45)),
        matchType: "DIRECT MATCH",
        harmony: "accent"
      };
    }
    if (colorDistance(accent.rgb, blouseRgb) < 55) {
      score = Math.max(score, 84);
      matchType = "DIRECT MATCH";
      harmony = "accent";
    }
  }

  if (hueDiff >= 140 && hueDiff <= 220) {
    score = Math.max(score, 78 + Math.min(12, primary.confidence / 10));
    matchType = "TRADITIONAL MATCH";
    harmony = "complementary";
  }

  if (hueDiff <= 35 && primaryHsl.s > 0.12) {
    score = Math.max(score, 70);
    matchType = "DESIGNER MATCH";
    harmony = "analogous";
  }

  if (isNeutralBlouse(blouseName) && primaryHsl.s > 0.18) {
    score = Math.max(score, 74);
    harmony = "neutral";
    matchType = "CONTRAST MATCH";
  }

  if (isCoolRgb(primary.rgb) && isWarmRgb(blouseRgb)) {
    score = Math.max(score, 76);
    matchType = "TRADITIONAL MATCH";
    harmony = "traditional";
  }

  if (isWarmRgb(primary.rgb) && blouseName === "Emerald Green") {
    score = Math.max(score, 80);
    matchType = "TRADITIONAL MATCH";
    harmony = "traditional";
  }

  if (isCoolRgb(primary.rgb) && (blouseName === "Maroon" || blouseName === "Wine")) {
    score = Math.max(score, 82);
    matchType = "TRADITIONAL MATCH";
    harmony = "traditional";
  }

  if (primaryHsl.l < 0.25 && (blouseName === "Gold" || blouseName === "Silver")) {
    score = Math.max(score, 85);
    matchType = "DIRECT MATCH";
    harmony = border && isZariLike(border.name) ? "zari" : "traditional";
  }

  if (primaryHsl.s < 0.12 && !isNeutralBlouse(blouseName)) {
    score += 8;
    harmony = "complementary";
  }

  if (blouseName === "Mustard" && isWarmRgb(primary.rgb)) {
    score = Math.max(score, 75);
    harmony = "analogous";
  }

  if (blouseName === "Magenta Pink" && (primary.name.toLowerCase().includes("pink") || primaryHsl.h < 20 || primaryHsl.h > 320)) {
    score = Math.max(score, 78);
    harmony = "analogous";
  }

  score += Math.max(0, Math.min(8, Math.round((primary.confidence - 60) / 5)));

  if (score < 68) return null;

  return {
    name: blouseName,
    rgb: blouseRgb,
    score: Math.min(99, score),
    matchType,
    harmony
  };
}

function collectDetectedPalette(detectedColors: DetectedColor[]) {
  const primary = detectedColors.find((c) => c.role === "primary") ?? detectedColors[0];
  const border =
    detectedColors.find((c) => c.role === "secondary" && !c.uncertain) ?? null;
  const accent =
    detectedColors.find((c) => c.role === "accent" && !c.uncertain) ?? null;

  return { primary, border, accent };
}

export function canGenerateHarmonyRecommendations(detectedColors: DetectedColor[]): boolean {
  const { primary } = collectDetectedPalette(detectedColors);
  if (!primary) return false;
  if (primary.uncertain) return false;
  if (primary.confidence < MIN_PRIMARY_CONFIDENCE) return false;
  return true;
}

export type HarmonyRecommendation = {
  name: string;
  matchPercent: number;
  matchType: HarmonyMatchType;
  reason: string;
  harmony: HarmonyKind;
};

export function generateHarmonyRecommendations(
  detectedColors: DetectedColor[]
): HarmonyRecommendation[] {
  if (!canGenerateHarmonyRecommendations(detectedColors)) {
    return [];
  }

  const { primary, border, accent } = collectDetectedPalette(detectedColors);
  if (!primary) return [];

  const scored: ScoredCandidate[] = [];

  for (const [name, rgb] of Object.entries(BLOUSE_COLOR_RGB)) {
    const candidate = scoreBlouseColor(name, rgb, primary, border, accent);
    if (candidate) scored.push(candidate);
  }

  scored.sort((a, b) => b.score - a.score);

  const unique: ScoredCandidate[] = [];
  for (const candidate of scored) {
    if (unique.some((u) => u.name.toLowerCase() === candidate.name.toLowerCase())) continue;
    unique.push(candidate);
    if (unique.length >= 5) break;
  }

  return unique.map((candidate, index) => ({
    name: candidate.name,
    matchPercent: Math.min(99, Math.max(75, candidate.score - index * 2)),
    matchType: candidate.matchType,
    reason: buildReason(candidate.name, candidate.harmony, primary, border, accent),
    harmony: candidate.harmony
  }));
}

export function blouseRgbForName(name: string): Rgb {
  return BLOUSE_COLOR_RGB[name] ?? hexToRgb(blouseHexForName(name)) ?? { r: 128, g: 128, b: 128 };
}
