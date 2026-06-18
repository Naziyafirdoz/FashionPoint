"use client";

import { useState, useTransition } from "react";
import { updateMeasurementsAction } from "@/app/(store)/account/actions";
import {
  AuthError,
  AuthSuccess,
  authInputClassName,
  authLabelClassName
} from "@/components/auth/AuthLayout";
import { CM_TO_INCH, INCH_TO_CM, KG_TO_LBS, type CustomerMeasurements } from "@/lib/measurements";

type MeasurementsFormProps = {
  initial: CustomerMeasurements;
  onCancel: () => void;
  onSaved: () => void;
};

function toDisplayInches(value: number | null | undefined, unit: "inch" | "cm") {
  if (value == null) return "";
  return unit === "inch" ? String(value) : String(Number((value * INCH_TO_CM).toFixed(1)));
}

function toDisplayHeight(valueCm: number | null | undefined, unit: "cm" | "inch") {
  if (valueCm == null) return "";
  return unit === "cm" ? String(valueCm) : String(Number((valueCm * CM_TO_INCH).toFixed(1)));
}

function toDisplayWeight(valueKg: number | null | undefined, unit: "kg" | "lb") {
  if (valueKg == null) return "";
  return unit === "kg" ? String(valueKg) : String(Number((valueKg * KG_TO_LBS).toFixed(1)));
}

export function MeasurementsForm({ initial, onCancel, onSaved }: MeasurementsFormProps) {
  const [lengthUnit, setLengthUnit] = useState<"inch" | "cm">("inch");
  const [heightUnit, setHeightUnit] = useState<"cm" | "inch">("cm");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">("kg");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    formData.set("length_unit", lengthUnit);
    formData.set("height_unit", heightUnit);
    formData.set("weight_unit", weightUnit);

    startTransition(async () => {
      const result = await updateMeasurementsAction(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      onSaved();
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <AuthError message={error} />
      <AuthSuccess message={success ? "Measurements saved successfully." : null} />

      <div className="flex flex-wrap gap-2">
        <UnitToggle
          label="Body measurements"
          options={[
            { value: "inch", label: "Inches" },
            { value: "cm", label: "cm" }
          ]}
          value={lengthUnit}
          onChange={setLengthUnit}
        />
        <UnitToggle
          label="Height"
          options={[
            { value: "cm", label: "cm" },
            { value: "inch", label: "inches" }
          ]}
          value={heightUnit}
          onChange={setHeightUnit}
        />
        <UnitToggle
          label="Weight"
          options={[
            { value: "kg", label: "kg" },
            { value: "lb", label: "lbs" }
          ]}
          value={weightUnit}
          onChange={setWeightUnit}
        />
      </div>

      <fieldset className="space-y-4 border-t border-accent/20 pt-4">
        <legend className="text-sm font-semibold text-primary">
          Body measurements ({lengthUnit === "inch" ? "inches" : "cm"})
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="bust_measurement"
            name="bust_measurement"
            label="Bust"
            defaultValue={toDisplayInches(initial.bust_measurement, lengthUnit)}
            key={`bust-${lengthUnit}`}
          />
          <Field
            id="underbust_measurement"
            name="underbust_measurement"
            label="Underbust"
            defaultValue={toDisplayInches(initial.underbust_measurement, lengthUnit)}
            key={`underbust-${lengthUnit}`}
          />
          <Field
            id="waist_measurement"
            name="waist_measurement"
            label="Waist"
            defaultValue={toDisplayInches(initial.waist_measurement, lengthUnit)}
            key={`waist-${lengthUnit}`}
          />
          <Field
            id="shoulder_measurement"
            name="shoulder_measurement"
            label="Shoulder"
            defaultValue={toDisplayInches(initial.shoulder_measurement, lengthUnit)}
            key={`shoulder-${lengthUnit}`}
          />
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="height"
          name="height"
          label={`Height (${heightUnit === "cm" ? "cm" : "inches"})`}
          defaultValue={toDisplayHeight(initial.height_cm, heightUnit)}
          key={`height-${heightUnit}`}
        />
        <Field
          id="weight"
          name="weight"
          label={`Weight (${weightUnit === "kg" ? "kg" : "lbs"})`}
          defaultValue={toDisplayWeight(initial.weight_kg, weightUnit)}
          key={`weight-${weightUnit}`}
        />
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <button type="submit" disabled={pending} className="btn-primary flex-1 sm:flex-none">
          {pending ? "Saving…" : "Save Measurements"}
        </button>
        <button type="button" onClick={onCancel} className="btn-outline flex-1 sm:flex-none">
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({
  id,
  name,
  label,
  defaultValue
}: {
  id: string;
  name: string;
  label: string;
  defaultValue: string;
}) {
  return (
    <div>
      <label htmlFor={id} className={authLabelClassName()}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="number"
        step="0.1"
        min="0"
        defaultValue={defaultValue}
        className={authInputClassName()}
      />
    </div>
  );
}

function UnitToggle<T extends string>({
  label,
  options,
  value,
  onChange
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="text-xs">
      <span className="text-foreground/60">{label}: </span>
      <span className="inline-flex rounded-full border border-accent/30 bg-white p-0.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-full px-2.5 py-0.5 transition ${
              value === opt.value ? "bg-primary text-white" : "text-foreground/70"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </span>
    </div>
  );
}
