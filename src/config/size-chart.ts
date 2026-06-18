/**
 * Configurable blouse size chart — update values here without touching UI components.
 * Future admin UI can load/save this structure from the database.
 */

export type FitPreference = "fitted" | "regular" | "loose";

export type SizeChartEntry = {
  /** Display label e.g. S(34) */
  label: string;
  /** URL slug e.g. S34 for /products?size=S34 */
  slug: string;
  bust: number;
  underbust: number;
  waist: number;
  shoulder: number;
};

export type MeasurementField = "bust" | "underbust" | "waist" | "shoulder";

export type MeasurementValidation = {
  min: number;
  max: number;
  label: string;
  unit: string;
};

export type MeasurementGuide = {
  field: MeasurementField;
  title: string;
  description: string;
  tip: string;
};

export type SizeChartConfig = {
  version: string;
  weights: {
    bust: number;
    underbust: number;
    waist: number;
    shoulder: number;
  };
  /** Reserved for future ease rules — matching uses raw customer measurements vs chart */
  bustEaseInches: number;
  validation: Record<MeasurementField, MeasurementValidation>;
  sizes: SizeChartEntry[];
  fitPreferenceLabels: Record<FitPreference, string>;
  confidenceThresholds: {
    exact: number;
    close: number;
    borderline: number;
    warningBelow: number;
  };
  /** Normalized weighted distance bands (0 = exact chart match, 1 = one full spread off). */
  confidenceBands: {
    exact: { distanceMax: number; scoreMin: number; scoreMax: number };
    close: { distanceMax: number; scoreMin: number; scoreMax: number };
    borderline: { distanceMax: number; scoreMin: number; scoreMax: number };
    poor: { distanceMax: number; scoreMin: number; scoreMax: number };
  };
  measurementGuides: MeasurementGuide[];
};

export const SIZE_CHART_CONFIG: SizeChartConfig = {
  version: "1.0.0",
  weights: {
    bust: 0.4,
    underbust: 0.1,
    waist: 0.3,
    shoulder: 0.2
  },
  bustEaseInches: 0,
  validation: {
    bust: { min: 28, max: 50, label: "Bust", unit: "inches" },
    underbust: { min: 26, max: 48, label: "Underbust", unit: "inches" },
    waist: { min: 24, max: 46, label: "Waist", unit: "inches" },
    shoulder: { min: 11, max: 18, label: "Shoulder", unit: "inches" }
  },
  sizes: [
    { label: "XS(32)", slug: "XS32", bust: 32, underbust: 30, waist: 28, shoulder: 13 },
    { label: "S(34)", slug: "S34", bust: 34, underbust: 32, waist: 30, shoulder: 13.5 },
    { label: "M(36)", slug: "M36", bust: 36, underbust: 34, waist: 32, shoulder: 14 },
    { label: "L(38)", slug: "L38", bust: 38, underbust: 36, waist: 34, shoulder: 14.5 },
    { label: "XL(40)", slug: "XL40", bust: 40, underbust: 38, waist: 36, shoulder: 15 },
    { label: "XXL(42)", slug: "XXL42", bust: 42, underbust: 40, waist: 38, shoulder: 15.5 },
    { label: "3XL(44)", slug: "3XL44", bust: 44, underbust: 42, waist: 40, shoulder: 16 }
  ],
  fitPreferenceLabels: {
    fitted: "Fitted",
    regular: "Regular",
    loose: "Loose"
  },
  confidenceThresholds: {
    exact: 95,
    close: 85,
    borderline: 70,
    warningBelow: 70
  },
  confidenceBands: {
    exact: { distanceMax: 0.08, scoreMin: 95, scoreMax: 99 },
    close: { distanceMax: 0.22, scoreMin: 85, scoreMax: 94 },
    borderline: { distanceMax: 0.45, scoreMin: 70, scoreMax: 84 },
    poor: { distanceMax: 1, scoreMin: 35, scoreMax: 69 }
  },
  measurementGuides: [
    {
      field: "bust",
      title: "Bust",
      description: "Tape around the fullest part of your bust, parallel to the floor.",
      tip: "Wear a well-fitted unpadded bra while measuring."
    },
    {
      field: "underbust",
      title: "Underbust",
      description: "Tape directly under your bust where the blouse band sits, snug but not tight.",
      tip: "Keep the tape level all the way around."
    },
    {
      field: "waist",
      title: "Waist",
      description: "Tape around your natural waist — typically the narrowest point above your navel.",
      tip: "Do not suck in your stomach — stand relaxed."
    },
    {
      field: "shoulder",
      title: "Shoulder",
      description: "Measure shoulder tip to shoulder tip across your back, over the shoulder blades.",
      tip: "Ask someone to help for the most accurate reading."
    }
  ]
};

/** @deprecated Use SIZE_CHART_CONFIG.sizes — kept for size-guide and legacy imports */
export function getSizeChartRows() {
  return SIZE_CHART_CONFIG.sizes.map((s) => ({
    name: s.label,
    bust: s.bust,
    underbust: s.underbust,
    waist: s.waist,
    shoulder: s.shoulder
  }));
}

export function sizeLabelToSlug(label: string): string {
  const entry = SIZE_CHART_CONFIG.sizes.find((s) => s.label === label);
  if (entry) return entry.slug;
  const compact = label.replace(/[()]/g, "").replace(/\s+/g, "");
  return compact || label;
}

/** Normalize ?size=S34 or ?size=S(34) to chart label S(34) */
export function normalizeSizeFilter(size: string): string {
  const trimmed = size.trim();
  if (!trimmed) return trimmed;

  const bySlug = SIZE_CHART_CONFIG.sizes.find(
    (s) => s.slug.toLowerCase() === trimmed.toLowerCase()
  );
  if (bySlug) return bySlug.label;

  const byLabel = SIZE_CHART_CONFIG.sizes.find(
    (s) => s.label.toLowerCase() === trimmed.toLowerCase()
  );
  if (byLabel) return byLabel.label;

  const match = trimmed.match(/^([A-Za-z0-9]+)[\s(]?(\d{2})[\s)]?$/);
  if (match) {
    const label = `${match[1]}(${match[2]})`;
    const byParsed = SIZE_CHART_CONFIG.sizes.find((s) => s.label === label);
    if (byParsed) return byParsed.label;
  }

  return trimmed;
}
