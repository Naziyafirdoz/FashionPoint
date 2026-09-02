"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  Circle,
  Loader2,
  Minus,
  Ruler,
  Sparkles
} from "lucide-react";
import toast from "react-hot-toast";
import { findSize } from "@/lib/ai-size-finder";
import {
  validateMeasurementField,
  validateMeasurementForm,
  type MeasurementFormValues
} from "@/lib/size-finder-validation";
import { SIZE_CHART_CONFIG, type FitPreference, type MeasurementField } from "@/config/size-chart";
import { saveSizeRecommendationAction } from "@/app/(store)/account/actions";
import { MeasurementHelpAccordion } from "@/components/ai/size-finder/MeasurementHelpAccordion";
import { SizeFinderHero } from "@/components/ai/size-finder/SizeFinderHero";
import { SizeFinderRecommendationPanel } from "@/components/ai/size-finder/SizeFinderRecommendationPanel";
import { SizeFinderSizeChart } from "@/components/ai/size-finder/SizeFinderSizeChart";
import type { SizeRecommendation } from "@/types";

export type SavedMeasurements = {
  bust?: number | null;
  underbust?: number | null;
  waist?: number | null;
  shoulder?: number | null;
};

export type SavedSizeProfile = {
  recommended_size?: string | null;
  preferred_size?: string | null;
  fit_preference?: string | null;
  sizing_updated_at?: string | null;
};

type SizeFinderClientProps = {
  savedMeasurements?: SavedMeasurements | null;
  savedSizeProfile?: SavedSizeProfile | null;
  isLoggedIn?: boolean;
  storeName: string;
};

const FIELD_ORDER: MeasurementField[] = ["bust", "underbust", "waist", "shoulder"];

const FIELD_ICONS: Record<MeasurementField, typeof Ruler> = {
  bust: Circle,
  underbust: Minus,
  waist: Ruler,
  shoulder: ArrowLeftRight
};

function buildInitialForm(saved?: SavedMeasurements | null): MeasurementFormValues {
  return {
    bust: saved?.bust != null ? String(saved.bust) : "",
    underbust: saved?.underbust != null ? String(saved.underbust) : "",
    waist: saved?.waist != null ? String(saved.waist) : "",
    shoulder: saved?.shoulder != null ? String(saved.shoulder) : ""
  };
}

function formatSavedAt(iso?: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  } catch {
    return null;
  }
}

export function SizeFinderClient({
  savedMeasurements,
  savedSizeProfile,
  isLoggedIn = false,
  storeName
}: SizeFinderClientProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const hasSaved = Boolean(
    savedMeasurements?.bust != null &&
      savedMeasurements?.waist != null &&
      savedMeasurements?.shoulder != null
  );

  const [form, setForm] = useState<MeasurementFormValues>(() => buildInitialForm(savedMeasurements));
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const [fitPreference, setFitPreference] = useState<FitPreference>(
    (savedSizeProfile?.fit_preference as FitPreference) ?? "regular"
  );
  const [result, setResult] = useState<SizeRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [savedProfile, setSavedProfile] = useState(savedSizeProfile ?? null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lastSavedSize =
    savedProfile?.recommended_size ?? savedProfile?.preferred_size ?? null;
  const lastSavedAt = formatSavedAt(savedProfile?.sizing_updated_at);

  const chartRows = useMemo(() => SIZE_CHART_CONFIG.sizes, []);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (saveState !== "success") return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      setSaveState("idle");
      setSaveMessage(null);
      saveTimeoutRef.current = null;
    }, 3000);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [saveState]);

  const updateField = (field: keyof MeasurementFormValues, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    const error = validateMeasurementField(field, value, field !== "underbust");
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (error) next[field] = error;
      else delete next[field];
      return next;
    });
    if (result) setResult(null);
  };

  const runRecommendation = (values: MeasurementFormValues, preference: FitPreference) => {
    const validation = validateMeasurementForm(values);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      return null;
    }

    return findSize({
      bust: validation.parsed.bust!,
      underbust: validation.parsed.underbust,
      waist: validation.parsed.waist!,
      shoulder: validation.parsed.shoulder!,
      fitPreference: preference
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateMeasurementForm(form);
    setFieldErrors(validation.errors);
    if (!validation.valid) return;

    setLoading(true);
    const rec = runRecommendation(form, fitPreference);
    if (!rec) {
      setLoading(false);
      return;
    }

    setResult(rec);
    await fetch("/api/ai/size-finder", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: { ...form, fitPreference }, output: rec })
    });
    setLoading(false);
  };

  const handleFitChange = (preference: FitPreference) => {
    setFitPreference(preference);
    const validation = validateMeasurementForm(form);
    if (!validation.valid) return;
    const rec = runRecommendation(form, preference);
    if (rec) setResult(rec);
  };

  const handleSaveSize = async () => {
    if (!isLoggedIn) {
      toast.error("Please sign in to save your recommended size");
      return;
    }
    if (!result) return;

    const validation = validateMeasurementForm(form);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setSaveState("error");
      setSaveMessage("Fix measurement errors before saving.");
      return;
    }

    setSaveState("saving");
    setSaveMessage(null);

    let finished = false;
    const saveTimeout = setTimeout(() => {
      if (!finished) {
        setSaveState("error");
        setSaveMessage("Save timed out. Please try again.");
      }
    }, 15000);

    try {
      const saveResult = await saveSizeRecommendationAction({
        recommendedSize: result.recommendedSize,
        fitPreference: result.fitPreference,
        measurements: {
          bust: validation.parsed.bust,
          underbust: validation.parsed.underbust,
          waist: validation.parsed.waist,
          shoulder: validation.parsed.shoulder
        }
      });

      finished = true;

      if (saveResult?.error) {
        setSaveState("error");
        setSaveMessage(saveResult.error);
        return;
      }

      const savedAt = saveResult.sizing_updated_at ?? new Date().toISOString();
      setSavedProfile({
        recommended_size: result.recommendedSize,
        fit_preference: result.fitPreference,
        sizing_updated_at: savedAt
      });
      setSaveState("success");
      setSaveMessage("Measurements and recommended size saved to your profile.");
    } catch {
      finished = true;
      setSaveState("error");
      setSaveMessage("Could not save. Please try again.");
    } finally {
      clearTimeout(saveTimeout);
    }
  };

  const handleEditMeasurements = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    firstFieldRef.current?.focus();
  };

  const handleTryAgain = () => {
    setResult(null);
    setSaveState("idle");
    setSaveMessage(null);
    handleEditMeasurements();
  };

  const formInvalid = Object.keys(fieldErrors).length > 0;

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-4 sm:px-6 sm:py-5">
      <SizeFinderHero
        storeName={storeName}
        hasSaved={hasSaved}
        lastSavedSize={lastSavedSize}
        lastSavedAt={lastSavedAt}
      />

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-[35fr_35fr_30fr] lg:items-stretch lg:gap-5">
        <form
          ref={formRef}
          id="measurement-form"
          onSubmit={submit}
          className="h-full rounded-[16px] border border-[#F3E5E8] bg-white p-4 shadow-[0_2px_14px_rgba(122,13,43,0.04)] md:col-span-1 lg:col-span-1"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFF0F3] text-primary">
              <Ruler className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-display text-base font-bold text-primary">Your Measurements</h2>
              <p className="text-[11px] text-foreground/60">All fields in inches</p>
            </div>
          </div>

          <div className="mt-3 space-y-2.5">
            {FIELD_ORDER.map((field, index) => {
              const meta = SIZE_CHART_CONFIG.validation[field];
              const Icon = FIELD_ICONS[field];
              return (
                <div key={field}>
                  <label htmlFor={field} className="mb-1 block text-xs font-medium text-[#2A2A2A]">
                    {meta.label}
                  </label>
                  <div className="relative">
                    <Icon
                      className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-primary/45"
                      aria-hidden="true"
                    />
                    <input
                      ref={index === 0 ? firstFieldRef : undefined}
                      id={field}
                      required={field !== "underbust"}
                      inputMode="decimal"
                      className={`w-full rounded-lg border bg-white py-2 pl-9 pr-14 text-sm transition focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/15 ${
                        fieldErrors[field] ? "border-red-400" : "border-[#F3E5E8]"
                      }`}
                      value={form[field]}
                      onChange={(e) => updateField(field, e.target.value)}
                      aria-invalid={Boolean(fieldErrors[field])}
                      aria-describedby={fieldErrors[field] ? `${field}-error` : `${field}-unit`}
                    />
                    <span
                      id={`${field}-unit`}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-foreground/45"
                    >
                      {meta.unit}
                    </span>
                  </div>
                  {fieldErrors[field] ? (
                    <p id={`${field}-error`} className="mt-1 text-xs text-red-600" role="alert">
                      {fieldErrors[field]}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>

          <fieldset className="mt-3">
            <legend className="mb-1.5 text-xs font-medium text-[#2A2A2A]">Fit Preference</legend>
            <div className="grid grid-cols-3 gap-1.5">
              {(["fitted", "regular", "loose"] as const).map((option) => (
                <label
                  key={option}
                  className={`flex cursor-pointer items-center justify-center rounded-lg border px-2 py-2 text-xs font-medium transition ${
                    fitPreference === option
                      ? "border-primary bg-[#FFF5F7] text-primary shadow-sm"
                      : "border-[#F3E5E8] bg-white text-foreground/70 hover:border-primary/20"
                  }`}
                >
                  <input
                    type="radio"
                    name="fitPreference"
                    className="sr-only"
                    checked={fitPreference === option}
                    onChange={() => handleFitChange(option)}
                  />
                  {SIZE_CHART_CONFIG.fitPreferenceLabels[option]}
                </label>
              ))}
            </div>
          </fieldset>

          <button
            type="submit"
            disabled={loading || formInvalid}
            className="btn-primary mt-4 inline-flex h-10 w-full items-center justify-center gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                FIND MY SIZE
              </>
            )}
          </button>

          {hasSaved ? (
            <p className="mt-2 text-center text-[11px] text-foreground/60">
              <Link href="/account/measurements" className="text-primary hover:underline">
                Edit saved measurements
              </Link>
            </p>
          ) : null}

          <p className="mt-1.5 text-center text-[11px] text-foreground/55">
            Your data is 100% secure and will not be shared.
          </p>
        </form>

        <div className="h-full md:col-span-1 lg:col-span-1">
          <SizeFinderRecommendationPanel
            loading={loading}
            result={result}
            isLoggedIn={isLoggedIn}
            saveState={saveState}
            saveMessage={saveMessage}
            onSave={handleSaveSize}
            onEditMeasurements={handleEditMeasurements}
            onTryAgain={handleTryAgain}
          />
        </div>

        <div className="flex flex-col gap-3 md:col-span-2 lg:col-span-1">
          <SizeFinderSizeChart rows={chartRows} recommendedSize={result?.recommendedSize ?? null} />
          <MeasurementHelpAccordion />
        </div>
      </div>
    </div>
  );
}
