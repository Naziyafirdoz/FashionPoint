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
const MIN_RECOMMENDATION_SCORE = 62;
const MAX_RECOMMENDATIONS = 5;

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
const METALLIC_BLOUSE_NAMES = new Set(["Gold", "Silver"]);
const FESTIVE_BLOUSE_NAMES = new Set(["Gold", "Silver", "Maroon", "Wine", "Red", "Magenta Pink"]);

type HarmonyKind =
  | "zari"
  | "accent"
  | "complementary"
  | "split-complementary"
  | "analogous"
  | "neutral"
  | "monochromatic";

type Hsl = { h: number; s: number; l: number };

type MetallicTone = "gold" | "silver" | "copper" | "none";

type DecorativeProminence = "low" | "medium" | "high";

type OccasionKind = "bridal" | "festive" | "party" | "office" | "casual";

type HarmonyFit = {
  kind: HarmonyKind;
  score: number;
  hueDiff: number;
};

type DecorativeSignal = {
  color: DetectedColor;
  rgb: Rgb;
  coverage: number;
  confidence: number;
  isMetallic: boolean;
  metallicTone: MetallicTone;
};

type PaletteContext = {
  primary: DetectedColor;
  border: DetectedColor | null;
  accent: DetectedColor | null;
  primaryHsl: Hsl;
  primaryCoverage: number;
  decorativeRgb: Rgb | null;
  decorativeCoverage: number;
  decorativeConfidence: number;
  borderCoverage: number;
  accentCoverage: number;
  metallicCoverage: number;
  metallicConfidence: number;
  metallicTone: MetallicTone;
  hasProminentDecoration: boolean;
  decorativeProminence: DecorativeProminence;
  occasion: OccasionKind;
  decorative: DecorativeSignal | null;
};

type ScoredCandidate = {
  name: string;
  rgb: Rgb;
  score: number;
  matchType: HarmonyMatchType;
  harmony: HarmonyKind;
  hueDiff: number;
  harmonyScore: number;
  traditionalBonus: number;
  metricsBonus: number;
};

function colorDistance(a: Rgb, b: Rgb): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

function rgbBrightness({ r, g, b }: Rgb): number {
  return (r + g + b) / 3;
}

function rgbSaturation({ r, g, b }: Rgb): number {
  return Math.max(r, g, b) - Math.min(r, g, b);
}

function channelSpread({ r, g, b }: Rgb): number {
  return Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
}

function rgbToHsl({ r, g, b }: Rgb): Hsl {
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

function normalizeHue(h: number): number {
  return ((h % 360) + 360) % 360;
}

function proximityScore(value: number, target: number, tolerance: number): number {
  if (tolerance <= 0) return value === target ? 100 : 0;
  const diff = Math.abs(value - target);
  return Math.max(0, 100 - (diff / tolerance) * 100);
}

function isNeutralBlouse(name: string): boolean {
  return NEUTRAL_BLOUSE_NAMES.has(name);
}

function isWarmHue(hue: number): boolean {
  const h = normalizeHue(hue);
  return h <= 70 || h >= 300;
}

function isCoolHue(hue: number): boolean {
  const h = normalizeHue(hue);
  return h >= 170 && h <= 280;
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

/** Classify metallic character from measured RGB — not from color name labels. */
function classifyMetallicToneFromRgb(rgb: Rgb): MetallicTone {
  const { r, g, b } = rgb;
  const spread = channelSpread(rgb);
  const bright = rgbBrightness(rgb);
  const sat = rgbSaturation(rgb);

  const goldDist = colorDistance(rgb, BLOUSE_COLOR_RGB.Gold);
  const silverDist = colorDistance(rgb, BLOUSE_COLOR_RGB.Silver);

  const silverLike = spread < 48 && bright > 105 && sat < 75;
  const goldLike =
    r > g + 6 &&
    r > b + 10 &&
    sat > 18 &&
    sat < 140 &&
    bright > 95;
  const copperLike = r > 145 && g > 70 && g < 135 && b < 95 && r > g + 18;

  if (!silverLike && !goldLike && !copperLike) {
    if (Math.min(goldDist, silverDist) > 85) return "none";
  }

  const silverScore = silverLike ? Math.max(0, 100 - silverDist / 1.4) : Math.max(0, 60 - silverDist / 2);
  const goldScore = goldLike ? Math.max(0, 100 - goldDist / 1.4) : Math.max(0, 55 - goldDist / 2);
  const copperScore = copperLike ? Math.max(0, 90 - colorDistance(rgb, { r: 184, g: 115, b: 51 }) / 1.6) : 0;

  const best = Math.max(silverScore, goldScore, copperScore);
  if (best < 28) return "none";
  if (silverScore >= goldScore && silverScore >= copperScore) return "silver";
  if (copperScore > goldScore && copperScore >= silverScore) return "copper";
  return "gold";
}

function isRgbMetallic(rgb: Rgb): boolean {
  return classifyMetallicToneFromRgb(rgb) !== "none";
}

function analyzeDecorativeColor(color: DetectedColor): DecorativeSignal {
  const metallicTone = classifyMetallicToneFromRgb(color.rgb);
  return {
    color,
    rgb: color.rgb,
    coverage: color.percent / 100,
    confidence: color.confidence,
    isMetallic: metallicTone !== "none",
    metallicTone
  };
}

function pickStrongestDecorative(
  border: DetectedColor | null,
  accent: DetectedColor | null
): DecorativeSignal | null {
  const candidates: DecorativeSignal[] = [];

  if (border && !border.uncertain) {
    candidates.push(analyzeDecorativeColor(border));
  }
  if (accent && !accent.uncertain) {
    candidates.push(analyzeDecorativeColor(accent));
  }

  if (!candidates.length) return null;

  return candidates.reduce((best, current) => {
    const bestStrength = best.coverage * (best.confidence / 100) * (best.isMetallic ? 1.25 : 1);
    const currentStrength = current.coverage * (current.confidence / 100) * (current.isMetallic ? 1.25 : 1);
    return currentStrength > bestStrength ? current : best;
  });
}

function decorativeProminenceFromCoverage(combinedPercent: number): DecorativeProminence {
  if (combinedPercent >= 12) return "high";
  if (combinedPercent >= 6) return "medium";
  return "low";
}

function inferOccasion(ctx: PaletteContext): OccasionKind {
  const decoPct = ctx.decorativeCoverage * 100;
  const sat = ctx.primaryHsl.s;
  const primaryName = ctx.primary.name.toLowerCase();

  if (decoPct >= 14 && sat > 0.32 && ctx.metallicTone === "gold") {
    return "bridal";
  }
  if (decoPct >= 9 && (ctx.metallicTone === "gold" || primaryName.includes("red"))) {
    return "festive";
  }
  if (decoPct >= 7 && sat > 0.26) {
    return "party";
  }
  if (decoPct < 5 && sat < 0.22) {
    return "office";
  }
  if (decoPct < 6 && sat < 0.3) {
    return "casual";
  }
  return "festive";
}

function buildPaletteContext(
  primary: DetectedColor,
  border: DetectedColor | null,
  accent: DetectedColor | null
): PaletteContext {
  const borderSignal = border && !border.uncertain ? analyzeDecorativeColor(border) : null;
  const accentSignal = accent && !accent.uncertain ? analyzeDecorativeColor(accent) : null;
  const decorative = pickStrongestDecorative(border, accent);

  const borderCoverage = borderSignal?.coverage ?? 0;
  const accentCoverage = accentSignal?.coverage ?? 0;
  const decorativeCoverage = Math.min(1, borderCoverage + accentCoverage * 0.65);

  const metallicCoverage = Math.min(
    1,
    (borderSignal?.isMetallic ? borderSignal.coverage : 0) +
      (accentSignal?.isMetallic ? accentSignal.coverage * 0.5 : 0)
  );

  const metallicConfidence = Math.max(
    borderSignal?.isMetallic ? borderSignal.confidence : 0,
    accentSignal?.isMetallic ? accentSignal.confidence : 0
  );

  const metallicTone = decorative?.isMetallic
    ? decorative.metallicTone
    : borderSignal?.isMetallic
      ? borderSignal.metallicTone
      : accentSignal?.isMetallic
        ? accentSignal.metallicTone
        : "none";

  const decorativeProminence = decorativeProminenceFromCoverage(decorativeCoverage * 100);
  const decorativeConfidence = decorative?.confidence ?? 0;

  const hasProminentDecoration =
    decorativeCoverage >= 0.08 && decorativeConfidence >= 58 && decorative !== null;

  const ctx: PaletteContext = {
    primary,
    border,
    accent,
    primaryHsl: rgbToHsl(primary.rgb),
    primaryCoverage: primary.percent / 100,
    decorativeRgb: decorative?.rgb ?? null,
    decorativeCoverage,
    decorativeConfidence,
    borderCoverage,
    accentCoverage,
    metallicCoverage,
    metallicConfidence,
    metallicTone,
    hasProminentDecoration,
    decorativeProminence,
    occasion: "festive",
    decorative
  };

  ctx.occasion = inferOccasion(ctx);
  return ctx;
}

function signalWeight(color: DetectedColor | null, prominence: DecorativeProminence): number {
  if (!color || color.uncertain) return 0;
  const coverageCap = prominence === "high" ? 55 : prominence === "medium" ? 42 : 35;
  const coverageFactor = Math.min(1, color.percent / coverageCap);
  const confidenceFactor = color.confidence / 100;
  return coverageFactor * confidenceFactor;
}

function getBlendWeights(ctx: PaletteContext): {
  primary: number;
  border: number;
  accent: number;
} {
  switch (ctx.decorativeProminence) {
    case "high":
      return { primary: 0.28, border: 0.48, accent: 0.14 };
    case "medium":
      return { primary: 0.38, border: 0.35, accent: 0.12 };
    default:
      return { primary: 0.52, border: 0.23, accent: 0.15 };
  }
}

function getDecorativeLaneWeight(ctx: PaletteContext): number {
  if (!ctx.hasProminentDecoration || !ctx.decorativeRgb) return 0;

  const coverageFactor = Math.min(1, ctx.decorativeCoverage / 0.18);
  const confidenceFactor = ctx.decorativeConfidence / 100;
  const metallicFactor = ctx.metallicCoverage > 0.04 ? 1 + ctx.metallicCoverage * 0.8 : 0.85;

  return Math.min(0.42, (0.1 + coverageFactor * 0.22 + confidenceFactor * 0.08) * metallicFactor);
}

function scoreComplementary(refHsl: Hsl, blouseHsl: Hsl, hueDiff: number): HarmonyFit {
  const fit = proximityScore(hueDiff, 180, 50);
  const satBoost = Math.min(12, refHsl.s * 18 + blouseHsl.s * 10);
  return {
    kind: "complementary",
    score: Math.min(100, fit + satBoost * 0.35),
    hueDiff
  };
}

function scoreSplitComplementary(refHsl: Hsl, blouseHsl: Hsl, hueDiff: number): HarmonyFit {
  const targetA = normalizeHue(refHsl.h + 150);
  const targetB = normalizeHue(refHsl.h + 210);
  const distA = hueDistance(blouseHsl.h, targetA);
  const distB = hueDistance(blouseHsl.h, targetB);
  const nearest = Math.min(distA, distB);
  const fit = proximityScore(nearest, 0, 32);
  return {
    kind: "split-complementary",
    score: Math.min(100, fit + Math.min(8, refHsl.s * 12)),
    hueDiff
  };
}

function scoreAnalogous(refHsl: Hsl, blouseHsl: Hsl, hueDiff: number): HarmonyFit {
  if (hueDiff > 65) {
    return { kind: "analogous", score: 0, hueDiff };
  }
  const fit = proximityScore(hueDiff, 28, 30);
  const satBalance = 100 - Math.abs(refHsl.s - blouseHsl.s) * 90;
  return {
    kind: "analogous",
    score: Math.min(100, fit * 0.75 + Math.max(0, satBalance) * 0.25),
    hueDiff
  };
}

function scoreMonochromatic(refHsl: Hsl, blouseHsl: Hsl, hueDiff: number): HarmonyFit {
  if (hueDiff > 22 || refHsl.s < 0.08) {
    return { kind: "monochromatic", score: 0, hueDiff };
  }
  const hueFit = proximityScore(hueDiff, 0, 22);
  const satFit = proximityScore(blouseHsl.s, refHsl.s, 0.35);
  const lightContrast = Math.abs(refHsl.l - blouseHsl.l);
  const contrastFit = proximityScore(lightContrast, 0.22, 0.28);
  return {
    kind: "monochromatic",
    score: Math.min(100, hueFit * 0.5 + satFit * 0.25 + contrastFit * 0.25),
    hueDiff
  };
}

function scoreNeutralPairing(
  refHsl: Hsl,
  blouseHsl: Hsl,
  blouseName: string,
  hueDiff: number
): HarmonyFit {
  if (!isNeutralBlouse(blouseName)) {
    return { kind: "neutral", score: 0, hueDiff };
  }

  const blouseNeutralStrength = 1 - Math.min(1, blouseHsl.s / 0.22);
  const primarySaturation = Math.min(1, refHsl.s / 0.45);
  const lightnessContrast = Math.abs(refHsl.l - blouseHsl.l);
  const contrastFit = proximityScore(lightnessContrast, 0.35, 0.4);

  const score =
    blouseNeutralStrength * 45 + primarySaturation * 30 + contrastFit * 0.25;

  return {
    kind: "neutral",
    score: Math.min(100, score),
    hueDiff
  };
}

function scoreMetallicPairing(
  blouseName: string,
  blouseRgb: Rgb,
  ref: DetectedColor,
  ctx: PaletteContext
): HarmonyFit {
  if (!METALLIC_BLOUSE_NAMES.has(blouseName)) {
    return { kind: "zari", score: 0, hueDiff: 0 };
  }

  const refTone = classifyMetallicToneFromRgb(ref.rgb);
  const rgbIsMetallic = refTone !== "none" || isRgbMetallic(ref.rgb);
  const catalogDist = Math.min(
    colorDistance(ref.rgb, BLOUSE_COLOR_RGB.Gold),
    colorDistance(ref.rgb, BLOUSE_COLOR_RGB.Silver)
  );

  if (!rgbIsMetallic && catalogDist > 90) {
    return { kind: "zari", score: 0, hueDiff: 0 };
  }

  const rgbFit = Math.max(0, 100 - colorDistance(ref.rgb, blouseRgb) / 1.35);
  const coverageBoost = ctx.metallicCoverage * 34 + ctx.borderCoverage * 18;
  const confidenceBoost = (ref.confidence / 100) * 22;
  const brightnessBoost =
    proximityScore(rgbToHsl(blouseRgb).l, rgbToHsl(ref.rgb).l, 0.35) * 0.15;

  let toneAlignment = 0;
  if (refTone === "gold" && blouseName === "Gold") toneAlignment = 14;
  if (refTone === "silver" && blouseName === "Silver") toneAlignment = 14;
  if (refTone === "copper" && blouseName === "Gold") toneAlignment = 10;

  return {
    kind: "zari",
    score: Math.min(
      100,
      rgbFit * 0.58 + coverageBoost + confidenceBoost + brightnessBoost + toneAlignment
    ),
    hueDiff: hueDistance(ctx.primaryHsl.h, rgbToHsl(blouseRgb).h)
  };
}

function scoreDecorativeMetallicPairing(
  blouseName: string,
  blouseRgb: Rgb,
  ctx: PaletteContext
): HarmonyFit {
  if (!ctx.decorativeRgb || !ctx.hasProminentDecoration) {
    return { kind: "zari", score: 0, hueDiff: 0 };
  }

  if (!METALLIC_BLOUSE_NAMES.has(blouseName)) {
    return { kind: "zari", score: 0, hueDiff: 0 };
  }

  const rgbFit = Math.max(0, 100 - colorDistance(ctx.decorativeRgb, blouseRgb) / 1.25);
  const coverageBoost = ctx.decorativeCoverage * 38 + ctx.metallicCoverage * 28;
  const confidenceBoost = (ctx.decorativeConfidence / 100) * 20;

  let toneAlignment = 0;
  if (ctx.metallicTone === "gold" && blouseName === "Gold") toneAlignment = 18;
  if (ctx.metallicTone === "silver" && blouseName === "Silver") toneAlignment = 18;
  if (ctx.metallicTone === "copper" && blouseName === "Gold") toneAlignment = 12;

  const blouseHsl = rgbToHsl(blouseRgb);

  return {
    kind: "zari",
    score: Math.min(100, rgbFit * 0.62 + coverageBoost + confidenceBoost + toneAlignment),
    hueDiff: hueDistance(ctx.primaryHsl.h, blouseHsl.h)
  };
}

function scoreAccentEcho(
  blouseRgb: Rgb,
  accent: DetectedColor,
  primaryHsl: Hsl,
  ctx: PaletteContext
): HarmonyFit {
  const blouseHsl = rgbToHsl(blouseRgb);
  const hueDiff = hueDistance(primaryHsl.h, blouseHsl.h);
  const rgbFit = Math.max(0, 100 - colorDistance(accent.rgb, blouseRgb) / 1.8);
  const coverageBoost = Math.min(16, accent.percent / 3 + ctx.accentCoverage * 12);
  const confidenceBoost = (accent.confidence / 100) * 12;

  return {
    kind: "accent",
    score: Math.min(100, rgbFit * 0.72 + coverageBoost + confidenceBoost),
    hueDiff
  };
}

function bestHarmonyAgainstReference(
  ref: DetectedColor,
  blouseName: string,
  blouseRgb: Rgb,
  ctx: PaletteContext,
  options: { metallic?: boolean; accent?: boolean }
): HarmonyFit {
  const refHsl = rgbToHsl(ref.rgb);
  const blouseHsl = rgbToHsl(blouseRgb);
  const hueDiff = hueDistance(refHsl.h, blouseHsl.h);

  const candidates: HarmonyFit[] = [
    scoreComplementary(refHsl, blouseHsl, hueDiff),
    scoreSplitComplementary(refHsl, blouseHsl, hueDiff),
    scoreAnalogous(refHsl, blouseHsl, hueDiff),
    scoreMonochromatic(refHsl, blouseHsl, hueDiff),
    scoreNeutralPairing(refHsl, blouseHsl, blouseName, hueDiff)
  ];

  if (options.metallic) {
    candidates.push(scoreMetallicPairing(blouseName, blouseRgb, ref, ctx));
  }

  if (options.accent) {
    candidates.push(scoreAccentEcho(blouseRgb, ref, ctx.primaryHsl, ctx));
  }

  return candidates.reduce((best, current) => (current.score > best.score ? current : best));
}

function computeMetricsBonus(
  blouseHsl: Hsl,
  blouseRgb: Rgb,
  blouseName: string,
  ctx: PaletteContext,
  hueDiff: number
): number {
  let bonus = 0;

  bonus += Math.min(3, ctx.primaryCoverage * 8);
  bonus += Math.min(3, Math.abs(ctx.primaryHsl.s - blouseHsl.s) * 10);
  bonus += Math.min(3, Math.abs(ctx.primaryHsl.l - blouseHsl.l) * 8);
  bonus += Math.min(2, proximityScore(hueDiff, 180, 90) / 50);

  if (ctx.metallicCoverage > 0.04 && METALLIC_BLOUSE_NAMES.has(blouseName) && ctx.decorativeRgb) {
    const metallicFit = Math.max(0, 100 - colorDistance(ctx.decorativeRgb, blouseRgb) / 1.8);
    bonus += Math.min(5, (metallicFit / 100) * ctx.metallicCoverage * 18);
  }

  if (ctx.decorativeCoverage > 0.06) {
    bonus += Math.min(2, ctx.decorativeCoverage * 6);
  }

  if (ctx.primaryHsl.s > 0.2) {
    bonus += Math.min(2, ctx.primaryHsl.s * 4);
  }

  return Math.min(12, bonus);
}

/** Small festive styling bonus (~10% of total) derived from measured temperature and contrast. */
function computeTraditionalBonus(
  primaryHsl: Hsl,
  blouseHsl: Hsl,
  hueDiff: number
): number {
  let factor = 0;

  const warmCoolContrast =
    (isWarmHue(primaryHsl.h) && isCoolHue(blouseHsl.h)) ||
    (isCoolHue(primaryHsl.h) && isWarmHue(blouseHsl.h));
  if (warmCoolContrast && hueDiff >= 80 && hueDiff <= 200) {
    factor += 0.35;
  }

  if (primaryHsl.s > 0.3 && Math.abs(primaryHsl.l - blouseHsl.l) > 0.18) {
    factor += 0.25;
  }

  if (primaryHsl.l < 0.32 && blouseHsl.l > primaryHsl.l + 0.15) {
    factor += 0.2;
  }

  if (hueDiff >= 150 && hueDiff <= 210 && primaryHsl.s > 0.22) {
    factor += 0.2;
  }

  return Math.min(1, factor) * 10;
}

/** Occasion-aware nudge — max 5 points (~5%). */
function computeOccasionBonus(blouseName: string, ctx: PaletteContext): number {
  let bonus = 0;

  switch (ctx.occasion) {
    case "bridal":
      if (blouseName === "Gold" && ctx.metallicTone === "gold") bonus += 3;
      if (blouseName === "Maroon" || blouseName === "Wine") bonus += 2;
      if (blouseName === "Red") bonus += 1.5;
      break;
    case "festive":
      if (blouseName === "Gold" && ctx.metallicTone === "gold") bonus += 2.5;
      if (blouseName === "Silver" && ctx.metallicTone === "silver") bonus += 2.5;
      if ((blouseName === "Maroon" || blouseName === "Wine") && isWarmHue(ctx.primaryHsl.h)) {
        bonus += 2;
      }
      break;
    case "party":
      if (FESTIVE_BLOUSE_NAMES.has(blouseName)) bonus += 1.5;
      break;
    case "office":
      if (isNeutralBlouse(blouseName)) bonus += 3;
      if (blouseName === "Navy Blue" || blouseName === "Royal Navy Blue") bonus += 1;
      break;
    case "casual":
      if (isNeutralBlouse(blouseName)) bonus += 2.5;
      if (blouseName === "Beige" || blouseName === "Cream") bonus += 1;
      break;
  }

  return Math.min(5, bonus);
}

function matchTypeForHarmony(kind: HarmonyKind, score: number): HarmonyMatchType {
  if (kind === "zari" || kind === "accent" || (kind === "monochromatic" && score >= 72)) {
    return "DIRECT MATCH";
  }
  if (kind === "analogous" || kind === "split-complementary") {
    return "DESIGNER MATCH";
  }
  if (kind === "complementary") {
    return "TRADITIONAL MATCH";
  }
  return "CONTRAST MATCH";
}

function decorativeBorderLabel(ctx: PaletteContext): string {
  if (ctx.metallicTone === "silver") return "silver embroidered border";
  if (ctx.metallicTone === "gold") return "gold zari border";
  if (ctx.metallicTone === "copper") return "copper-toned border";
  if (ctx.decorativeCoverage >= 0.1) return "embroidered border";
  return "border detailing";
}

function occasionPhrase(ctx: PaletteContext): string | null {
  switch (ctx.occasion) {
    case "bridal":
      return "a refined bridal look";
    case "festive":
      return "a premium festive look";
    case "party":
      return "an elegant party-ready look";
    case "office":
      return "a polished office-friendly look";
    case "casual":
      return "an easy everyday look";
    default:
      return null;
  }
}

function buildReason(
  blouseName: string,
  harmony: HarmonyKind,
  ctx: PaletteContext,
  primary: DetectedColor
): string {
  const primaryName = primary.name;
  const borderLabel = decorativeBorderLabel(ctx);
  const occasion = occasionPhrase(ctx);
  const occasionSuffix = occasion ? ` for ${occasion}` : "";

  switch (harmony) {
    case "zari":
      if (blouseName === "Silver" && ctx.metallicTone === "silver") {
        return `Your saree has a prominent ${borderLabel}. A silver blouse creates${occasionSuffix || " a premium festive look"}.`;
      }
      if (blouseName === "Gold" && (ctx.metallicTone === "gold" || ctx.metallicTone === "copper")) {
        return `The rich gold tones in your saree's border and embroidery pair beautifully with a gold blouse${occasionSuffix || " for a classic festive ensemble"}.`;
      }
      if (METALLIC_BLOUSE_NAMES.has(blouseName)) {
        return `This ${blouseName.toLowerCase()} blouse echoes the metallic highlights detected in your saree's ${borderLabel}${occasionSuffix ? `, creating${occasionSuffix}` : "."}`;
      }
      return `This blouse complements the decorative ${borderLabel} woven into your saree.`;

    case "accent":
      return `This ${blouseName.toLowerCase()} tone picks up the accent highlights from your saree's embroidery and motifs.`;

    case "complementary":
      return `This blouse contrasts elegantly with your ${primaryName} saree body while keeping a balanced, polished appearance${occasionSuffix ? ` — ideal${occasionSuffix}` : "."}`;

    case "split-complementary":
      return `A stylish contrast to your ${primaryName} saree — this blouse adds depth without overpowering the border and body colors${occasionSuffix ? `, perfect${occasionSuffix}` : "."}`;

    case "analogous":
      return `This blouse stays in harmony with your ${primaryName} saree for a cohesive, designer-inspired finish${occasionSuffix ? `, suited${occasionSuffix}` : "."}`;

    case "neutral":
      if (ctx.hasProminentDecoration) {
        return `A soft ${blouseName.toLowerCase()} blouse lets your ${primaryName} saree and its ${borderLabel} stay the focus${occasionSuffix ? ` while keeping${occasionSuffix}` : "."}`;
      }
      return `A ${blouseName.toLowerCase()} blouse offers a clean, understated contrast that works beautifully with your ${primaryName} saree${occasionSuffix ? ` for${occasionSuffix}` : "."}`;

    case "monochromatic":
      return `A tonal match with your ${primaryName} saree — subtle, sophisticated, and easy to style${occasionSuffix ? ` for${occasionSuffix}` : "."}`;

    default:
      return `${blouseName} complements your ${primaryName} saree and its decorative details.`;
  }
}

function scoreBlouseColor(
  blouseName: string,
  blouseRgb: Rgb,
  ctx: PaletteContext
): ScoredCandidate | null {
  const { primary, border, accent } = ctx;

  if (isFabricEcho(blouseName, primary.name)) return null;

  const blouseHsl = rgbToHsl(blouseRgb);
  const rgbDist = colorDistance(primary.rgb, blouseRgb);
  if (rgbDist < 35) return null;

  const blend = getBlendWeights(ctx);
  const borderWeight = signalWeight(border, ctx.decorativeProminence);
  const accentWeight = signalWeight(accent, ctx.decorativeProminence);

  const primaryContribution = blend.primary;
  const borderContribution = blend.border * borderWeight;
  const accentContribution = blend.accent * accentWeight;

  const primaryFit = bestHarmonyAgainstReference(primary, blouseName, blouseRgb, ctx, {});

  const borderFit =
    border && borderWeight > 0
      ? bestHarmonyAgainstReference(border, blouseName, blouseRgb, ctx, { metallic: true })
      : null;

  const accentFit =
    accent && accentWeight > 0
      ? bestHarmonyAgainstReference(accent, blouseName, blouseRgb, ctx, { accent: true })
      : null;

  const decorativeFit = scoreDecorativeMetallicPairing(blouseName, blouseRgb, ctx);
  const decorativeLaneWeight = getDecorativeLaneWeight(ctx);

  const baseWeightSum = primaryContribution + borderContribution + accentContribution;

  let baseHarmonyScore =
    baseWeightSum > 0
      ? (primaryFit.score * primaryContribution +
          (borderFit?.score ?? 0) * borderContribution +
          (accentFit?.score ?? 0) * accentContribution) /
        baseWeightSum
      : primaryFit.score;

  baseHarmonyScore *=
    0.85 + ctx.primaryCoverage * 0.08 + Math.min(0.05, ctx.primary.confidence / 2000);

  let harmonyScore = baseHarmonyScore;
  if (decorativeLaneWeight > 0 && decorativeFit.score > 0) {
    harmonyScore =
      baseHarmonyScore * (1 - decorativeLaneWeight) + decorativeFit.score * decorativeLaneWeight;
  }

  const weightedFits: { fit: HarmonyFit; weight: number }[] = [
    { fit: primaryFit, weight: primaryContribution },
    ...(borderFit ? [{ fit: borderFit, weight: borderContribution }] : []),
    ...(accentFit ? [{ fit: accentFit, weight: accentContribution }] : []),
    ...(decorativeFit.score > 0 && decorativeLaneWeight > 0
      ? [{ fit: decorativeFit, weight: decorativeLaneWeight * 100 }]
      : [])
  ];

  const winningFit = weightedFits.reduce((best, current) => {
    const currentValue = current.fit.score * current.weight;
    const bestValue = best.fit.score * best.weight;
    return currentValue > bestValue ? current : best;
  }).fit;

  const traditionalBonus = computeTraditionalBonus(ctx.primaryHsl, blouseHsl, winningFit.hueDiff);
  const metricsBonus = computeMetricsBonus(
    blouseHsl,
    blouseRgb,
    blouseName,
    ctx,
    winningFit.hueDiff
  );
  const occasionBonus = computeOccasionBonus(blouseName, ctx);

  const finalScore = Math.min(99, harmonyScore + traditionalBonus + metricsBonus + occasionBonus);

  if (finalScore < MIN_RECOMMENDATION_SCORE) return null;

  return {
    name: blouseName,
    rgb: blouseRgb,
    score: finalScore,
    matchType: matchTypeForHarmony(winningFit.kind, winningFit.score),
    harmony: winningFit.kind,
    hueDiff: winningFit.hueDiff,
    harmonyScore,
    traditionalBonus,
    metricsBonus
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

  const ctx = buildPaletteContext(primary, border, accent);
  const scored: ScoredCandidate[] = [];

  for (const [name, rgb] of Object.entries(BLOUSE_COLOR_RGB)) {
    const candidate = scoreBlouseColor(name, rgb, ctx);
    if (candidate) scored.push(candidate);
  }

  scored.sort((a, b) => b.score - a.score);

  const unique: ScoredCandidate[] = [];
  for (const candidate of scored) {
    if (unique.some((u) => u.name.toLowerCase() === candidate.name.toLowerCase())) continue;
    unique.push(candidate);
    if (unique.length >= MAX_RECOMMENDATIONS) break;
  }

  return unique.map((candidate, index) => ({
    name: candidate.name,
    matchPercent: Math.round(Math.min(99, Math.max(0, candidate.score - index * 1.5))),
    matchType: candidate.matchType,
    reason: buildReason(candidate.name, candidate.harmony, ctx, primary),
    harmony: candidate.harmony
  }));
}

export function blouseRgbForName(name: string): Rgb {
  return BLOUSE_COLOR_RGB[name] ?? hexToRgb(blouseHexForName(name)) ?? { r: 128, g: 128, b: 128 };
}
