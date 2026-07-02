"use client";

import { AlertCircle, RefreshCw } from "lucide-react";

type ColorMatcherErrorStateProps = {
  message: string;
  onRetry?: () => void;
  onReset?: () => void;
};

export function ColorMatcherErrorState({ message, onRetry, onReset }: ColorMatcherErrorStateProps) {
  return (
    <div
      className="rounded-[18px] border border-red-200/80 bg-red-50/60 p-5"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-red-900">Something went wrong</p>
          <p className="mt-1 text-sm text-red-800/90">{message}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-semibold text-white transition hover:bg-[#8f1230] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                Try Again
              </button>
            ) : null}
            {onReset ? (
              <button
                type="button"
                onClick={onReset}
                className="inline-flex h-9 items-center rounded-full border border-red-300/60 bg-white px-4 text-xs font-semibold text-red-900 transition hover:bg-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Start Over
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
