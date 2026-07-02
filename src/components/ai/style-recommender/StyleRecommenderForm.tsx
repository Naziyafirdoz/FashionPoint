"use client";

import type { StylePreferences } from "@/lib/style-recommender-ui";
import { formatInr } from "@/lib/style-recommender-ui";

const OCCASIONS = ["Wedding", "Daily", "Party", "Festive", "Office"] as const;
const STYLES = ["Elegant", "Traditional", "Modern", "Casual"] as const;
const NECK_STYLES = ["Boat", "V-Neck", "Round"] as const;
const SLEEVE_STYLES = ["Half", "Sleeveless", "Short"] as const;

const LOADING_MESSAGES = [
  "Analyzing your preferences...",
  "Finding the best styles...",
  "Matching your budget..."
] as const;

type StyleRecommenderFormProps = {
  prefs: StylePreferences;
  loading: boolean;
  loadingStep: number;
  onChange: (prefs: StylePreferences) => void;
  onSubmit: (e: React.FormEvent) => void;
};

function SelectField({
  id,
  label,
  value,
  options,
  onChange,
  disabled = false
}: {
  id: string;
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-xs font-semibold text-primary">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="mt-1 w-full rounded-lg border border-[#F2E4E8] bg-white px-3 py-2 text-sm text-foreground shadow-sm transition focus-visible:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

export function StyleRecommenderForm({
  prefs,
  loading,
  loadingStep,
  onChange,
  onSubmit
}: StyleRecommenderFormProps) {
  const loadingMessage = LOADING_MESSAGES[loadingStep % LOADING_MESSAGES.length];

  return (
    <section
      aria-label="Style preferences"
      className="rounded-[16px] border border-[#F2E4E8] bg-white p-3 shadow-[0_2px_16px_rgba(122,13,43,0.04)] sm:p-4"
    >
      <h2 className="text-sm font-bold text-primary">Your Style Preferences</h2>
      <p className="mt-0.5 text-xs text-foreground/55">
        Tell us what you are looking for and we will find matching blouses.
      </p>

      <form onSubmit={onSubmit} className="mt-3 space-y-3">
        <SelectField
          id="occasion"
          label="Occasion"
          value={prefs.occasion}
          options={OCCASIONS}
          onChange={(occasion) => onChange({ ...prefs, occasion })}
          disabled={loading}
        />

        <SelectField
          id="stylePreference"
          label="Style Preference"
          value={prefs.stylePreference}
          options={STYLES}
          onChange={(stylePreference) => onChange({ ...prefs, stylePreference })}
          disabled={loading}
        />

        <div>
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="budget" className="text-xs font-semibold text-primary">
              Budget
            </label>
            <span className="text-[10px] text-foreground/50" aria-hidden="true">
              {formatInr(500)} — {formatInr(5000)}
            </span>
          </div>
          <input
            id="budget"
            type="range"
            min={500}
            max={5000}
            step={100}
            value={prefs.budget}
            onChange={(e) => onChange({ ...prefs, budget: Number(e.target.value) })}
            disabled={loading}
            aria-valuemin={500}
            aria-valuemax={5000}
            aria-valuenow={prefs.budget}
            aria-valuetext={formatInr(prefs.budget)}
            className="mt-2 w-full accent-primary"
          />
          <p className="mt-1.5 text-center text-[11px] text-foreground/55">Current Budget</p>
          <p className="text-center font-display text-lg font-bold text-primary" aria-live="polite">
            {formatInr(prefs.budget)}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            id="neckStyle"
            label="Neck Design"
            value={prefs.neckStyle}
            options={NECK_STYLES}
            onChange={(neckStyle) => onChange({ ...prefs, neckStyle })}
            disabled={loading}
          />
          <SelectField
            id="sleeveStyle"
            label="Preferred Sleeve"
            value={prefs.sleeveStyle}
            options={SLEEVE_STYLES}
            onChange={(sleeveStyle) => onChange({ ...prefs, sleeveStyle })}
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary flex h-11 w-full items-center justify-center gap-1.5 rounded-full text-sm font-semibold shadow-[0_4px_14px_rgba(122,13,43,0.18)] transition hover:shadow-[0_6px_18px_rgba(122,13,43,0.22)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? (
            <span aria-live="polite">{loadingMessage}</span>
          ) : (
            <>
              <span aria-hidden="true">✨</span>
              Find My Perfect Blouse
            </>
          )}
        </button>
      </form>
    </section>
  );
}
