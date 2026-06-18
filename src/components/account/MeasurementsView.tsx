"use client";

import { useState } from "react";
import Link from "next/link";
import { Ruler, Pencil } from "lucide-react";
import {
  formatBodyMeasurement,
  formatHeight,
  formatSizeLabel,
  formatWeight,
  getRecommendedSize,
  hasSavedMeasurements,
  type CustomerMeasurements
} from "@/lib/measurements";
import { MeasurementsForm } from "@/components/account/MeasurementsForm";

type MeasurementsViewProps = {
  measurements: CustomerMeasurements;
};

export function MeasurementsView({ measurements }: MeasurementsViewProps) {
  const [editing, setEditing] = useState(false);
  const [lengthUnit, setLengthUnit] = useState<"inch" | "cm">("inch");
  const [heightUnit, setHeightUnit] = useState<"cm" | "inch">("cm");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">("kg");

  const saved = hasSavedMeasurements(measurements);
  const recommendation = getRecommendedSize(measurements);

  if (!saved && !editing) {
    return (
      <div className="card-store mt-8 text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
          <Ruler className="h-12 w-12 text-primary" strokeWidth={1.5} />
        </div>
        <p className="mt-6 text-lg font-medium text-primary">No measurements saved yet</p>
        <p className="mt-2 text-sm text-foreground/70">
          Add your measurements to get perfect size recommendations
        </p>
        <button type="button" onClick={() => setEditing(true)} className="btn-primary mt-6">
          Add Measurements
        </button>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="card-store mt-8">
        <MeasurementsForm
          initial={measurements}
          onCancel={() => setEditing(false)}
          onSaved={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="card-store mt-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-primary">Your Measurements</h2>
          {recommendation ? (
            <p className="mt-2 text-sm text-foreground/80">
              Recommended size:{" "}
              <span className="font-semibold text-primary">
                {formatSizeLabel(recommendation.size)}
              </span>
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="btn-outline inline-flex items-center gap-2 text-sm"
        >
          <Pencil className="h-4 w-4" />
          Edit
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <UnitToggle
          options={[
            { value: "inch", label: "Inches" },
            { value: "cm", label: "cm" }
          ]}
          value={lengthUnit}
          onChange={setLengthUnit}
        />
        <UnitToggle
          options={[
            { value: "cm", label: "Height cm" },
            { value: "inch", label: "Height in" }
          ]}
          value={heightUnit}
          onChange={setHeightUnit}
        />
        <UnitToggle
          options={[
            { value: "kg", label: "kg" },
            { value: "lb", label: "lbs" }
          ]}
          value={weightUnit}
          onChange={setWeightUnit}
        />
      </div>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <MeasurementRow
          label="Bust"
          value={formatBodyMeasurement(measurements.bust_measurement, lengthUnit)}
        />
        <MeasurementRow
          label="Underbust"
          value={formatBodyMeasurement(measurements.underbust_measurement, lengthUnit)}
        />
        <MeasurementRow
          label="Waist"
          value={formatBodyMeasurement(measurements.waist_measurement, lengthUnit)}
        />
        <MeasurementRow
          label="Shoulder"
          value={formatBodyMeasurement(measurements.shoulder_measurement, lengthUnit)}
        />
        <MeasurementRow
          label="Height"
          value={formatHeight(measurements.height_cm, heightUnit)}
        />
        <MeasurementRow
          label="Weight"
          value={formatWeight(measurements.weight_kg, weightUnit)}
        />
      </dl>

      <Link
        href="/ai-features/size-finder"
        className="mt-6 inline-block text-sm text-primary hover:underline"
      >
        Try AI Size Finder →
      </Link>
    </div>
  );
}

function MeasurementRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-accent/20 bg-blush/30 px-4 py-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-foreground/60">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

function UnitToggle<T extends string>({
  options,
  value,
  onChange
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-accent/30 bg-white p-0.5 text-xs">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-full px-3 py-1 transition ${
            value === opt.value ? "bg-primary text-white" : "text-foreground/70 hover:text-primary"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
