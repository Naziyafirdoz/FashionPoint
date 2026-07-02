"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Bot,
  CheckCircle,
  Crown,
  Loader2,
  Pencil,
  RotateCcw
} from "lucide-react";
import { AuthError, AuthSuccess } from "@/components/auth/AuthLayout";
import type { SizeRecommendation } from "@/types";

type SizeFinderRecommendationPanelProps = {
  loading: boolean;
  result: SizeRecommendation | null;
  isLoggedIn: boolean;
  saveState: "idle" | "saving" | "success" | "error";
  saveMessage: string | null;
  onSave: () => void;
  onEditMeasurements: () => void;
  onTryAgain: () => void;
};

export function SizeFinderRecommendationPanel({
  loading,
  result,
  isLoggedIn,
  saveState,
  saveMessage,
  onSave,
  onEditMeasurements,
  onTryAgain
}: SizeFinderRecommendationPanelProps) {
  const isEmpty = !loading && !result;

  return (
    <section
      aria-labelledby="recommendation-heading"
      aria-live="polite"
      className={`flex h-full flex-col rounded-[16px] border border-[#F3E5E8] bg-white shadow-[0_2px_14px_rgba(122,13,43,0.04)] ${
        isEmpty ? "p-4" : "p-4 sm:p-5"
      }`}
    >
      <h2 id="recommendation-heading" className="font-display text-base font-bold text-primary">
        AI Recommendation
      </h2>
      {!isEmpty ? (
        <p className="mt-0.5 text-xs text-foreground/60">Your personalized blouse size match</p>
      ) : null}

      <div className={`flex flex-1 flex-col ${isEmpty ? "mt-2" : "mt-3"}`}>
        {loading ? (
          <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-foreground/75">Analyzing your measurements...</p>
          </div>
        ) : result ? (
          <motion.div
            key={result.recommendedSize}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="space-y-3"
          >
            <div className="rounded-xl border border-primary/15 bg-gradient-to-br from-[#FFF5F7] via-white to-[#FFF8EC] p-4 shadow-[0_4px_16px_rgba(123,13,43,0.06)]">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-primary/70">
                    Recommended Size
                  </p>
                  <p className="mt-0.5 font-display text-3xl font-bold text-primary">{result.recommendedSize}</p>
                </div>
                <Crown className="h-6 w-6 shrink-0 text-secondary" aria-hidden="true" />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-white/80 px-2.5 py-2">
                  <p className="text-foreground/55">Confidence</p>
                  <p className="font-semibold text-primary">{result.confidenceScore}% Match</p>
                </div>
                <div className="rounded-lg bg-white/80 px-2.5 py-2">
                  <p className="text-foreground/55">Fit Type</p>
                  <p className="font-semibold text-[#2A2A2A]">{result.fitType}</p>
                </div>
              </div>

              <p className="mt-2 text-xs font-medium text-primary">{result.confidenceLabel}</p>
              <p className="mt-1 text-xs leading-relaxed text-foreground/70">
                This size provides the most comfortable fit based on your measurements.
              </p>

              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#F3E5E8]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-700"
                  style={{ width: `${result.confidenceScore}%` }}
                  role="progressbar"
                  aria-valuenow={result.confidenceScore}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Fit confidence"
                />
              </div>
            </div>

            {result.spanningSizesNotice ? (
              <div className="flex items-start gap-2 rounded-lg bg-sky-50 px-2.5 py-2 text-left text-xs text-sky-900">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <p>{result.spanningSizesNotice}</p>
              </div>
            ) : null}

            {result.showLowConfidenceWarning ? (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-2.5 py-2 text-left text-xs text-amber-900">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <p>
                  We are less confident in this match. Consider re-measuring or trying a nearby size.
                </p>
              </div>
            ) : null}

            <div className="rounded-lg border border-[#F3E5E8] bg-[#FFFBFC] p-3 text-xs">
              <p className="font-semibold text-primary">Why this size?</p>
              <ul className="mt-1.5 space-y-1 text-foreground/80">
                {result.explanations.map((line) => (
                  <li key={line} className="flex gap-1.5">
                    <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onEditMeasurements}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-primary/25 bg-white text-xs font-medium text-primary transition hover:bg-[#FFF5F7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={onTryAgain}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-primary/25 bg-white text-xs font-medium text-primary transition hover:bg-[#FFF5F7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  Try Again
                </button>
              </div>

              <AuthSuccess message={saveState === "success" ? saveMessage : null} />
              <AuthError message={saveState === "error" ? saveMessage : null} />
              <button
                type="button"
                onClick={onSave}
                disabled={saveState === "saving" || !isLoggedIn}
                className="btn-outline w-full text-xs disabled:opacity-60"
              >
                {saveState === "saving" ? "Saving measurements..." : "Save Recommended Size"}
              </button>
              {!isLoggedIn ? (
                <p className="text-[11px] text-foreground/60">
                  <Link href="/login?redirect=/ai-features/size-finder" className="text-primary underline">
                    Sign in
                  </Link>{" "}
                  to save your size to your profile.
                </p>
              ) : null}
              <Link
                href={`/products?size=${encodeURIComponent(result.shopSizeSlug)}`}
                className="btn-primary inline-flex w-full justify-center text-sm"
              >
                SHOP THIS SIZE
              </Link>
            </div>
          </motion.div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[#E8D4DA] bg-[#FFFBFC] px-4 py-6 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FFF0F3] text-primary">
              <Bot className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-primary">AI Ready</p>
            <p className="mt-1 max-w-[220px] text-xs leading-relaxed text-foreground/65">
              Enter your measurements and click Find My Size.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
