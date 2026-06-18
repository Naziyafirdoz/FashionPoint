"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle, Crown, HelpCircle } from "lucide-react";
import toast from "react-hot-toast";
import { AuthError, AuthSuccess } from "@/components/auth/AuthLayout";
import { findSize } from "@/lib/ai-size-finder";
import {
  validateMeasurementField,
  validateMeasurementForm,
  type MeasurementFormValues
} from "@/lib/size-finder-validation";
import { SIZE_CHART_CONFIG, type FitPreference } from "@/config/size-chart";
import { saveSizeRecommendationAction } from "@/app/(store)/account/actions";
import { MeasurementGuideModal } from "./MeasurementGuideModal";
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
};

const FIELD_ORDER = ["bust", "underbust", "waist", "shoulder"] as const;

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
  isLoggedIn = false
}: SizeFinderClientProps) {
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
  const [guideOpen, setGuideOpen] = useState(false);
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

  const formInvalid = Object.keys(fieldErrors).length > 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold text-primary">AI Size Finder</h1>
      <p className="mt-2 max-w-2xl text-sm text-foreground/70">
        Smart scoring compares your measurements against our size chart to recommend the best
        blouse fit — with clear reasons you can trust.
      </p>

      {hasSaved ? (
        <p className="mt-2 text-sm text-foreground/70">
          Pre-filled from your saved measurements.{" "}
          <Link href="/account/measurements" className="text-primary hover:underline">
            Edit measurements
          </Link>
        </p>
      ) : null}

      {lastSavedSize ? (
        <p className="mt-2 text-sm text-foreground/80">
          Last saved size: <span className="font-semibold text-primary">{lastSavedSize}</span>
          {lastSavedAt ? <span className="text-foreground/60"> · {lastSavedAt}</span> : null}
        </p>
      ) : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <form onSubmit={submit} className="card-store space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold">Your Measurements</p>
            <button
              type="button"
              onClick={() => setGuideOpen(true)}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <HelpCircle className="h-4 w-4" />
              How to Measure?
            </button>
          </div>

          {FIELD_ORDER.map((field) => {
            const meta = SIZE_CHART_CONFIG.validation[field];
            return (
              <div key={field}>
                <label htmlFor={field} className="mb-1 block text-sm font-medium">
                  {meta.label} ({meta.unit})
                </label>
                <input
                  id={field}
                  required={field !== "underbust"}
                  inputMode="decimal"
                  className={`w-full rounded-lg border px-3 py-2 text-sm ${
                    fieldErrors[field] ? "border-red-500" : ""
                  }`}
                  value={form[field]}
                  onChange={(e) => updateField(field, e.target.value)}
                  aria-invalid={Boolean(fieldErrors[field])}
                  aria-describedby={fieldErrors[field] ? `${field}-error` : undefined}
                />
                {fieldErrors[field] ? (
                  <p id={`${field}-error`} className="mt-1 text-xs text-red-600" role="alert">
                    {fieldErrors[field]}
                  </p>
                ) : null}
              </div>
            );
          })}

          <div>
            <p className="mb-2 text-sm font-medium">Fit Preference</p>
            <div className="space-y-2">
              {(["fitted", "regular", "loose"] as const).map((option) => (
                <label key={option} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="fitPreference"
                    checked={fitPreference === option}
                    onChange={() => handleFitChange(option)}
                  />
                  {SIZE_CHART_CONFIG.fitPreferenceLabels[option]}
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || formInvalid}
            className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Calculating..." : "FIND MY SIZE"}
          </button>
          <p className="text-xs text-foreground/60">
            Your data is 100% secure and will not be shared.
          </p>
        </form>

        <div className="card-store">
          {result ? (
            <div className="text-center">
              <Crown className="mx-auto h-10 w-10 text-secondary" />
              <p className="mt-4 text-sm font-medium text-foreground/70">Recommended Size</p>
              <p className="text-3xl font-bold text-primary">{result.recommendedSize}</p>

              <div className="mt-4 space-y-1 text-sm">
                <p>
                  <span className="text-foreground/60">Confidence:</span>{" "}
                  <span className="font-semibold">{result.confidenceScore}%</span>
                </p>
                <p className="font-medium text-primary">{result.confidenceLabel}</p>
                <p>
                  <span className="text-foreground/60">Fit Type:</span>{" "}
                  <span className="font-medium">{result.fitType}</span>
                </p>
              </div>

              {result.spanningSizesNotice ? (
                <div className="mt-4 flex items-start gap-2 rounded-lg bg-sky-50 px-3 py-2 text-left text-xs text-sky-900">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{result.spanningSizesNotice}</p>
                </div>
              ) : null}

              {result.showLowConfidenceWarning ? (
                <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-left text-xs text-amber-900">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    We are less confident in this match. Consider re-measuring or trying a
                    nearby size.
                  </p>
                </div>
              ) : null}

              <div className="mx-auto mt-4 h-2 max-w-xs rounded-full bg-blush">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${result.confidenceScore}%` }}
                />
              </div>

              <div className="mt-6 rounded-lg bg-blush/40 p-4 text-left text-sm">
                <p className="font-semibold text-primary">Why this size?</p>
                <ul className="mt-2 space-y-1 text-foreground/80">
                  {result.explanations.map((line) => (
                    <li key={line} className="flex gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                <AuthSuccess
                  message={saveState === "success" ? saveMessage : null}
                />
                <AuthError message={saveState === "error" ? saveMessage : null} />
                <button
                  type="button"
                  onClick={handleSaveSize}
                  disabled={saveState === "saving" || !isLoggedIn}
                  className="btn-outline w-full text-sm disabled:opacity-60"
                >
                  {saveState === "saving" ? "Saving measurements..." : "Save Recommended Size"}
                </button>
                {!isLoggedIn ? (
                  <p className="text-xs text-foreground/60">
                    <Link href="/login?redirect=/ai-features/size-finder" className="text-primary underline">
                      Sign in
                    </Link>{" "}
                    to save your size to your profile.
                  </p>
                ) : null}
                <Link
                  href={`/products?size=${encodeURIComponent(result.shopSizeSlug)}`}
                  className="btn-primary inline-flex w-full justify-center"
                >
                  SHOP THIS SIZE
                </Link>
              </div>
            </div>
          ) : (
            <p className="py-12 text-center text-foreground/60">
              Enter valid measurements to get your personalized size recommendation.
            </p>
          )}
        </div>

        <div className="card-store overflow-x-auto">
          <p className="mb-3 text-sm font-semibold text-primary">Size Chart</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-primary">
                <th className="py-2">Size</th>
                <th>Bust</th>
                <th>Underbust</th>
                <th>Waist</th>
                <th>Shoulder</th>
              </tr>
            </thead>
            <tbody>
              {chartRows.map((s) => (
                <tr
                  key={s.label}
                  className={
                    result?.recommendedSize === s.label
                      ? "bg-primary/10 font-bold text-primary"
                      : "border-b"
                  }
                >
                  <td className="py-2">{s.label}</td>
                  <td>{s.bust}</td>
                  <td>{s.underbust}</td>
                  <td>{s.waist}</td>
                  <td>{s.shoulder}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <MeasurementGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  );
}
