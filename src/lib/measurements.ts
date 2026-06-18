import { findSize } from "@/lib/ai-size-finder";

export type CustomerMeasurements = {
  bust_measurement?: number | null;
  underbust_measurement?: number | null;
  waist_measurement?: number | null;
  shoulder_measurement?: number | null;
  height_cm?: number | null;
  weight_kg?: number | null;
};

export const INCH_TO_CM = 2.54;
export const CM_TO_INCH = 1 / INCH_TO_CM;
export const KG_TO_LBS = 2.20462;

export function hasSavedMeasurements(customer: CustomerMeasurements | null | undefined) {
  if (!customer) return false;
  return (
    customer.bust_measurement != null ||
    customer.underbust_measurement != null ||
    customer.waist_measurement != null ||
    customer.shoulder_measurement != null ||
    customer.height_cm != null ||
    customer.weight_kg != null
  );
}

export function canRecommendSize(customer: CustomerMeasurements | null | undefined) {
  if (!customer) return false;
  return (
    customer.bust_measurement != null &&
    customer.waist_measurement != null &&
    customer.shoulder_measurement != null
  );
}

export function formatSizeLabel(size: string) {
  const match = size.match(/^(.+?)\((.+)\)$/);
  if (match) return `${match[1]} (${match[2]})`;
  return size;
}

export function getRecommendedSize(customer: CustomerMeasurements) {
  if (!canRecommendSize(customer)) return null;
  return findSize({
    bust: Number(customer.bust_measurement),
    underbust: customer.underbust_measurement ? Number(customer.underbust_measurement) : undefined,
    waist: Number(customer.waist_measurement),
    shoulder: Number(customer.shoulder_measurement)
  });
}

export function formatBodyMeasurement(valueInches: number | null | undefined, unit: "inch" | "cm") {
  if (valueInches == null) return "—";
  const inches = valueInches;
  const cm = valueInches * INCH_TO_CM;
  return unit === "inch"
    ? `${inches.toFixed(1)}" / ${cm.toFixed(1)} cm`
    : `${cm.toFixed(1)} cm / ${inches.toFixed(1)}"`;
}

export function formatHeight(valueCm: number | null | undefined, unit: "cm" | "inch") {
  if (valueCm == null) return "—";
  const cm = valueCm;
  const inches = valueCm * CM_TO_INCH;
  return unit === "cm"
    ? `${cm.toFixed(1)} cm / ${inches.toFixed(1)}"`
    : `${inches.toFixed(1)}" / ${cm.toFixed(1)} cm`;
}

export function formatWeight(valueKg: number | null | undefined, unit: "kg" | "lb") {
  if (valueKg == null) return "—";
  const kg = valueKg;
  const lbs = valueKg * KG_TO_LBS;
  return unit === "kg"
    ? `${kg.toFixed(1)} kg / ${lbs.toFixed(1)} lbs`
    : `${lbs.toFixed(1)} lbs / ${kg.toFixed(1)} kg`;
}
