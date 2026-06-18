import {
  SIZE_CHART_CONFIG,
  type MeasurementField
} from "@/config/size-chart";

export type MeasurementFormValues = Record<MeasurementField, string>;

export type FieldErrors = Partial<Record<MeasurementField, string>>;

function parseInches(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
}

export function validateMeasurementField(
  field: MeasurementField,
  value: string,
  required = true
): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return required ? `${SIZE_CHART_CONFIG.validation[field].label} is required` : null;
  }

  const num = parseInches(trimmed);
  if (num == null) {
    return `Enter a valid number for ${SIZE_CHART_CONFIG.validation[field].label}`;
  }

  const { min, max, label, unit } = SIZE_CHART_CONFIG.validation[field];
  if (num < min || num > max) {
    return `${label} must be between ${min} and ${max} ${unit}`;
  }

  return null;
}

export function validateMeasurementForm(values: MeasurementFormValues): {
  valid: boolean;
  errors: FieldErrors;
  parsed: Partial<Record<MeasurementField, number>>;
} {
  const errors: FieldErrors = {};
  const parsed: Partial<Record<MeasurementField, number>> = {};

  (Object.keys(SIZE_CHART_CONFIG.validation) as MeasurementField[]).forEach((field) => {
    const required = field !== "underbust";
    const error = validateMeasurementField(field, values[field], required);
    if (error) {
      errors[field] = error;
      return;
    }
    const num = parseInches(values[field]);
    if (num != null) parsed[field] = num;
  });

  return { valid: Object.keys(errors).length === 0, errors, parsed };
}
