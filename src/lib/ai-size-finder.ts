import {
  SIZE_CHART_CONFIG,
  type FitPreference,
  type SizeChartEntry
} from "@/config/size-chart";
import type { SizeRecommendation } from "@/types";

export type SizeFinderInput = {
  bust: number;
  underbust?: number;
  waist: number;
  shoulder: number;
  fitPreference?: FitPreference;
};

type SizeScore = {
  label: string;
  slug: string;
  score: number;
};

type ScoringDimension = "bust" | "underbust" | "waist" | "shoulder";
type CoreDimension = "bust" | "waist" | "shoulder";

type ResolvedWeights = {
  bust: number;
  underbust: number;
  waist: number;
  shoulder: number;
  hasUnderbust: boolean;
};

type DimensionMatch = {
  entry: SizeChartEntry;
  delta: number;
  between: [SizeChartEntry, SizeChartEntry] | null;
};

type SizeAnalysis = {
  scores: SizeScore[];
  regularIndex: number;
  nearestIndex: number;
  finalIndex: number;
  dimensionMatches: Record<CoreDimension, DimensionMatch> & {
    underbust?: DimensionMatch;
  };
};

const MATCH_EPSILON = 0.15;
const SPANNING_SIZES_NOTICE =
  "Your measurements span multiple size groups. We recommend the bust-based size and tailoring if needed.";

function hasUnderbustInput(input: SizeFinderInput): boolean {
  return input.underbust != null && Number.isFinite(input.underbust);
}

function resolveWeights(input: SizeFinderInput): ResolvedWeights {
  const { bust, underbust, waist, shoulder } = SIZE_CHART_CONFIG.weights;

  if (hasUnderbustInput(input)) {
    return { bust, underbust, waist, shoulder, hasUnderbust: true };
  }

  return {
    bust: bust + underbust,
    underbust: 0,
    waist,
    shoulder,
    hasUnderbust: false
  };
}

function dimensionSpread(dimension: ScoringDimension): number {
  const values = SIZE_CHART_CONFIG.sizes.map((s) => s[dimension]);
  return Math.max(Math.max(...values) - Math.min(...values), 1);
}

function scoreDimension(customerValue: number, chartValue: number, spread: number): number {
  const delta = Math.abs(customerValue - chartValue);
  return Math.max(0, 100 - (delta / spread) * 100);
}

function scoreSize(entry: SizeChartEntry, input: SizeFinderInput): number {
  const weights = resolveWeights(input);

  const bustScore = scoreDimension(input.bust, entry.bust, dimensionSpread("bust"));
  const waistScore = scoreDimension(input.waist, entry.waist, dimensionSpread("waist"));
  const shoulderScore = scoreDimension(
    input.shoulder,
    entry.shoulder,
    dimensionSpread("shoulder")
  );
  const underbustScore = weights.hasUnderbust
    ? scoreDimension(input.underbust!, entry.underbust, dimensionSpread("underbust"))
    : 0;

  const total =
    bustScore * weights.bust +
    underbustScore * (weights.hasUnderbust ? weights.underbust : 0) +
    waistScore * weights.waist +
    shoulderScore * weights.shoulder;

  return Math.round(total);
}

function dimensionDelta(
  input: SizeFinderInput,
  entry: SizeChartEntry,
  dimension: ScoringDimension
): number {
  const customer =
    dimension === "underbust" ? input.underbust! : input[dimension as CoreDimension];
  return Math.abs(customer - entry[dimension]);
}

function weightedMeasurementDistance(entry: SizeChartEntry, input: SizeFinderInput): number {
  const weights = resolveWeights(input);
  let weightedTotal = 0;
  let weightSum = 0;

  const add = (dimension: ScoringDimension, weight: number) => {
    if (weight <= 0) return;
    const spread = dimensionSpread(dimension);
    const normalized = dimensionDelta(input, entry, dimension) / spread;
    weightedTotal += weight * normalized;
    weightSum += weight;
  };

  add("bust", weights.bust);
  add("waist", weights.waist);
  add("shoulder", weights.shoulder);
  if (weights.hasUnderbust) {
    add("underbust", weights.underbust);
  }

  return weightSum > 0 ? weightedTotal / weightSum : 1;
}

function interpolateBand(
  distance: number,
  fromDistance: number,
  toDistance: number,
  scoreAtFrom: number,
  scoreAtTo: number
): number {
  if (toDistance <= fromDistance) return scoreAtFrom;
  const t = Math.min(1, Math.max(0, (distance - fromDistance) / (toDistance - fromDistance)));
  return scoreAtFrom - t * (scoreAtFrom - scoreAtTo);
}

function confidenceFromDistance(entry: SizeChartEntry, input: SizeFinderInput): number {
  const distance = weightedMeasurementDistance(entry, input);
  const { exact, close, borderline, poor } = SIZE_CHART_CONFIG.confidenceBands;

  if (distance <= exact.distanceMax) {
    return Math.round(interpolateBand(distance, 0, exact.distanceMax, exact.scoreMax, exact.scoreMin));
  }
  if (distance <= close.distanceMax) {
    return Math.round(
      interpolateBand(distance, exact.distanceMax, close.distanceMax, close.scoreMax, close.scoreMin)
    );
  }
  if (distance <= borderline.distanceMax) {
    return Math.round(
      interpolateBand(
        distance,
        close.distanceMax,
        borderline.distanceMax,
        borderline.scoreMax,
        borderline.scoreMin
      )
    );
  }

  return Math.round(
    interpolateBand(
      distance,
      borderline.distanceMax,
      poor.distanceMax,
      poor.scoreMax,
      poor.scoreMin
    )
  );
}

function rawDistance(entry: SizeChartEntry, input: SizeFinderInput): number {
  let distance =
    Math.abs(input.bust - entry.bust) +
    Math.abs(input.waist - entry.waist) +
    Math.abs(input.shoulder - entry.shoulder);

  if (hasUnderbustInput(input)) {
    distance += Math.abs(input.underbust! - entry.underbust);
  }

  return distance;
}

function matchDimension(
  input: SizeFinderInput,
  dimension: ScoringDimension
): DimensionMatch {
  const value =
    dimension === "underbust" ? input.underbust! : input[dimension as CoreDimension];
  const sorted = [...SIZE_CHART_CONFIG.sizes].sort((a, b) => a[dimension] - b[dimension]);

  let best = sorted[0];
  let bestDelta = Math.abs(value - best[dimension]);

  for (const entry of sorted) {
    const delta = Math.abs(value - entry[dimension]);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = entry;
    }
  }

  let between: [SizeChartEntry, SizeChartEntry] | null = null;
  for (let i = 0; i < sorted.length - 1; i++) {
    const lower = sorted[i];
    const upper = sorted[i + 1];
    if (value >= lower[dimension] && value <= upper[dimension]) {
      if (bestDelta > MATCH_EPSILON) {
        between = [lower, upper];
      }
      break;
    }
  }

  return { entry: best, delta: bestDelta, between };
}

function sizeIndexByLabel(label: string): number {
  return SIZE_CHART_CONFIG.sizes.findIndex((s) => s.label === label);
}

function minimumAccommodatingBustIndex(input: SizeFinderInput): number {
  const sizes = SIZE_CHART_CONFIG.sizes;
  for (let i = 0; i < sizes.length; i++) {
    if (sizes[i].bust >= input.bust) {
      return i;
    }
  }
  return sizes.length - 1;
}

function applyBustPriority(
  input: SizeFinderInput,
  analysis: SizeAnalysis,
  proposedFinalIndex: number
): { finalIndex: number; spanningSizes: boolean } {
  const bustMatchIndex = sizeIndexByLabel(analysis.dimensionMatches.bust.entry.label);
  const minBustIndex = minimumAccommodatingBustIndex(input);
  const requiredMinIndex = Math.max(bustMatchIndex, minBustIndex);
  const spanningSizes = bustMatchIndex > proposedFinalIndex + 1;

  let finalIndex = Math.max(proposedFinalIndex, requiredMinIndex);
  if (spanningSizes) {
    finalIndex = Math.max(finalIndex, bustMatchIndex);
  }

  return { finalIndex, spanningSizes };
}

function applyFitPreference(
  regularIndex: number,
  nearestIndex: number,
  preference: FitPreference
): number {
  const max = SIZE_CHART_CONFIG.sizes.length - 1;
  if (preference === "fitted") return nearestIndex;
  if (preference === "loose") return Math.min(regularIndex + 1, max);
  return regularIndex;
}

function describeDimensionMatch(dimensionLabel: string, match: DimensionMatch): string {
  if (match.delta <= MATCH_EPSILON) {
    return `${dimensionLabel} aligns with ${match.entry.label}`;
  }

  if (match.between) {
    const [lower, upper] = match.between;
    return `${dimensionLabel} falls between ${lower.label} and ${upper.label}`;
  }

  return `${dimensionLabel} is closest to ${match.entry.label}`;
}

function analyzeSizes(input: SizeFinderInput, fitPreference: FitPreference): SizeAnalysis {
  const sizes = SIZE_CHART_CONFIG.sizes;

  const scores: SizeScore[] = sizes.map((entry) => ({
    label: entry.label,
    slug: entry.slug,
    score: scoreSize(entry, input)
  }));

  const regularIndex = scores.reduce(
    (bestIdx, row, idx, arr) => (row.score > arr[bestIdx].score ? idx : bestIdx),
    0
  );

  const nearestIndex = sizes.reduce((bestIdx, entry, idx) => {
    const currentDistance = rawDistance(entry, input);
    const bestDistance = rawDistance(sizes[bestIdx], input);
    return currentDistance < bestDistance ? idx : bestIdx;
  }, 0);

  const finalIndex = applyFitPreference(regularIndex, nearestIndex, fitPreference);

  const dimensionMatches: SizeAnalysis["dimensionMatches"] = {
    bust: matchDimension(input, "bust"),
    waist: matchDimension(input, "waist"),
    shoulder: matchDimension(input, "shoulder")
  };

  if (hasUnderbustInput(input)) {
    dimensionMatches.underbust = matchDimension(input, "underbust");
  }

  return { scores, regularIndex, nearestIndex, finalIndex, dimensionMatches };
}

function buildExplanations(analysis: SizeAnalysis): string[] {
  const { dimensionMatches } = analysis;
  const lines = [
    describeDimensionMatch("Bust", dimensionMatches.bust),
    describeDimensionMatch("Waist", dimensionMatches.waist),
    describeDimensionMatch("Shoulder", dimensionMatches.shoulder)
  ];

  if (dimensionMatches.underbust) {
    lines.splice(1, 0, describeDimensionMatch("Underbust", dimensionMatches.underbust));
  }

  return lines;
}

function confidenceLabel(score: number): string {
  const { exact, close, borderline } = SIZE_CHART_CONFIG.confidenceThresholds;
  if (score >= exact) return "Excellent Fit";
  if (score >= close) return "Good Fit";
  if (score >= borderline) return "Borderline";
  return "Low Confidence";
}

export function findSize(input: SizeFinderInput): SizeRecommendation {
  const fitPreference = input.fitPreference ?? "regular";
  const analysis = analyzeSizes(input, fitPreference);
  const sizes = SIZE_CHART_CONFIG.sizes;

  const { finalIndex, spanningSizes } = applyBustPriority(
    input,
    analysis,
    analysis.finalIndex
  );

  const finalEntry = sizes[finalIndex];
  const confidenceScore = confidenceFromDistance(finalEntry, input);
  const explanations = buildExplanations(analysis);

  return {
    recommendedSize: finalEntry.label,
    size: finalEntry.label,
    confidenceScore,
    confidence: confidenceScore,
    fitPreference,
    fitType: SIZE_CHART_CONFIG.fitPreferenceLabels[fitPreference],
    confidenceLabel: confidenceLabel(confidenceScore),
    showLowConfidenceWarning:
      confidenceScore < SIZE_CHART_CONFIG.confidenceThresholds.warningBelow,
    spanningSizesNotice: spanningSizes ? SPANNING_SIZES_NOTICE : null,
    explanations,
    bustSize: finalEntry.bust,
    blouseLength: "14–15 in",
    shoulder: finalEntry.shoulder,
    armhole: 16,
    waist: finalEntry.waist,
    shopSizeSlug: finalEntry.slug
  };
}

/** @deprecated Use SIZE_CHART_CONFIG.sizes via getSizeChartRows() */
export const SIZES = SIZE_CHART_CONFIG.sizes.map((s) => ({
  name: s.label,
  bust: s.bust,
  underbust: s.underbust,
  waist: s.waist,
  shoulder: s.shoulder
}));
