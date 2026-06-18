"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, HelpCircle, Loader2, Palette, Sparkles, Upload } from "lucide-react";
import { buildPaletteInsights } from "@/lib/color-palette-insights";
import { useColorExtraction } from "@/hooks/useColorExtraction";
import { useColorRecommendations } from "@/hooks/useColorRecommendations";
import { ColorAlertModal } from "./ColorAlertModal";
import { ColorSareePreview } from "./ColorSareePreview";
import { ColorUploadGuideModal } from "./ColorUploadGuideModal";
import { ColorUploadSlotStatus } from "./ColorUploadSlotStatus";

const AUTO_ANALYZE_DELAY_MS = 400;

export function ColorMatcherClient() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const analyzingRef = useRef(false);
  const runAnalysisRef = useRef<() => Promise<void>>(async () => {});
  const [guideOpen, setGuideOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string | null>(null);
  const [alertColor, setAlertColor] = useState<string | null>(null);

  const {
    images,
    detectedColors,
    extracting,
    uploading,
    error: extractionError,
    setError: setExtractionError,
    addFiles,
    removeImage,
    moveImage,
    uploadImages,
    extractColors,
    reset: resetExtraction,
    maxImages,
    canAddMore
  } = useColorExtraction();

  const {
    result,
    loading: recommending,
    error: recommendationError,
    fetchRecommendations,
    reset: resetRecommendations,
    setError: setRecommendationError
  } = useColorRecommendations();

  const busy = extracting || uploading || recommending;
  const error = extractionError || recommendationError;

  const imagesFingerprint = useMemo(
    () => images.map((img) => `${img.id}:${img.slot}`).join("|"),
    [images]
  );

  const runAnalysis = useCallback(async () => {
    if (!images.length || analyzingRef.current) return;

    analyzingRef.current = true;
    setExtractionError(null);
    setRecommendationError(null);
    resetRecommendations();
    setAnalysisStep("Uploading photos…");

    try {
      const imageUrls = await uploadImages();
      if (!imageUrls.length) return;

      setAnalysisStep("Analyzing saree colors…");
      const colors = await extractColors();
      if (!colors.length) return;

      setAnalysisStep("Finding matching blouse colors…");
      await fetchRecommendations(imageUrls, colors);
    } finally {
      analyzingRef.current = false;
      setAnalysisStep(null);
    }
  }, [
    images.length,
    uploadImages,
    extractColors,
    fetchRecommendations,
    resetRecommendations,
    setExtractionError,
    setRecommendationError
  ]);

  useEffect(() => {
    runAnalysisRef.current = runAnalysis;
  }, [runAnalysis]);

  useEffect(() => {
    if (!images.length) return;

    const timer = setTimeout(() => {
      void runAnalysisRef.current();
    }, AUTO_ANALYZE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [imagesFingerprint, images.length]);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      await addFiles(files);
    },
    [addFiles]
  );

  const onDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();
      setDragOver(false);
      if (event.dataTransfer.files?.length) {
        await handleFiles(event.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleRemoveImage = useCallback(
    (id: string) => {
      removeImage(id);
      resetRecommendations();
    },
    [removeImage, resetRecommendations]
  );

  const handleMoveImage = useCallback(
    (id: string, direction: -1 | 1) => {
      moveImage(id, direction);
      resetRecommendations();
    },
    [moveImage, resetRecommendations]
  );

  const handleReset = () => {
    resetExtraction();
    resetRecommendations();
    setAnalysisStep(null);
  };

  const loadingMessage = analysisStep ?? "Analyzing saree colors…";

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 pb-6">
      <div className="text-center">
        <Palette className="mx-auto h-10 w-10 text-secondary" />
        <h1 className="mt-3 font-display text-3xl font-bold text-primary">Saree Color Matcher</h1>
        <p className="mt-2 text-sm text-foreground/70">
          Upload your saree photos and discover blouse colors that complement your drape.
        </p>
        <button
          type="button"
          onClick={() => setGuideOpen(true)}
          className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary underline-offset-2 hover:underline"
        >
          <HelpCircle className="h-4 w-4" />
          How To Upload Saree Photos?
        </button>
      </div>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">
        <div className="card-store h-fit">
          <p className="text-sm font-semibold text-primary">Upload saree photos</p>
          <p className="mt-1 text-xs text-foreground/60">
            Add 1–{maxImages} images — full saree, pallu, border, or embroidery close-ups.
          </p>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`mt-4 rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-accent/30 bg-blush/20"
            }`}
          >
            <Upload className="mx-auto h-8 w-8 text-primary/70" />
            <p className="mt-2 text-sm text-foreground/80">Drag and drop photos here</p>
            <p className="mt-1 text-xs text-foreground/60">JPG, PNG, WEBP — phone photos welcome</p>
            <button
              type="button"
              disabled={!canAddMore || busy}
              onClick={() => fileInputRef.current?.click()}
              className="btn-outline mt-4 text-sm disabled:opacity-60"
            >
              Choose Photos
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) void handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          <ColorUploadSlotStatus
            images={images}
            busy={busy}
            onRemove={handleRemoveImage}
            onMove={handleMoveImage}
          />

          {detectedColors.length && images[0] ? (
            <ColorSareePreview
              previewUrl={images[0].remoteUrl ?? images[0].previewUrl}
              detectedColors={detectedColors}
            />
          ) : null}

          {images.length ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {busy ? (
                <p className="inline-flex items-center gap-2 text-sm text-foreground/70">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  {loadingMessage}
                </p>
              ) : null}
              <button
                type="button"
                disabled={busy}
                onClick={() => void runAnalysis()}
                className="btn-outline px-4 py-1.5 text-xs disabled:opacity-60"
              >
                Reanalyze
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleReset}
                className="text-xs font-medium text-foreground/55 underline-offset-2 hover:text-primary hover:underline disabled:opacity-60"
              >
                Start Over
              </button>
            </div>
          ) : null}

          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </div>

        <div className="card-store h-fit">
          {busy && !detectedColors.length && !result ? (
            <div className="py-8 text-center text-foreground/60">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
              <p className="mt-4 text-sm">{loadingMessage}</p>
            </div>
          ) : !result && !detectedColors.length ? (
            <div className="py-8 text-center text-foreground/60">
              <Sparkles className="mx-auto h-10 w-10 text-secondary/70" />
              <p className="mt-4 text-sm">Upload saree photos to see detected colors and blouse matches.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {busy ? (
                <p className="inline-flex items-center gap-2 rounded-lg bg-blush/40 px-3 py-2 text-sm text-foreground/70">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  {loadingMessage}
                </p>
              ) : null}

              {detectedColors.length ? (
                <div>
                  <p className="font-display text-lg font-bold text-primary">Your Saree Palette</p>
                  <ul className="mt-4 space-y-3">
                    {detectedColors.map((color) => (
                      <li
                        key={`${color.role}-${color.displayLabel}`}
                        className="rounded-xl border border-accent/15 bg-gradient-to-r from-blush/50 to-white/80 px-4 py-4 shadow-sm"
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-foreground/55">
                          {color.displayLabel}
                        </p>
                        {color.uncertain ? (
                          <p className="mt-2 text-sm font-medium text-amber-800">{color.name}</p>
                        ) : (
                          <div className="mt-3 flex items-center gap-3">
                            <span
                              className="h-10 w-10 shrink-0 rounded-full border-2 border-white shadow-md ring-1 ring-accent/10"
                              style={{ backgroundColor: color.hex }}
                            />
                            <div>
                              <p className="text-base font-semibold text-foreground/90">
                                {color.name}
                              </p>
                              <p className="text-sm text-foreground/60">
                                {color.confidence}% Confidence
                              </p>
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>

                  {buildPaletteInsights(detectedColors).length ? (
                    <div className="mt-5 rounded-xl bg-blush/30 px-4 py-4">
                      <p className="text-sm font-semibold text-primary">Why These Colors Work</p>
                      <ul className="mt-2 space-y-1.5 text-sm text-foreground/80">
                        {buildPaletteInsights(detectedColors).map((line) => (
                          <li key={line} className="flex gap-2">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                            <span>{line}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {result?.recommendations?.length ? (
                <div>
                  <p className="text-sm font-semibold text-primary">Top Blouse Color Matches</p>
                  <ul className="mt-3 space-y-3">
                    {result.recommendations.map((rec) => (
                      <li
                        key={rec.slug}
                        className="rounded-xl border border-accent/20 bg-white/70 p-4 shadow-sm"
                      >
                        <div className="flex items-start gap-4">
                          <div className="text-left">
                            <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                              #{rec.rank}
                            </p>
                            <span
                              className="mt-2 inline-block h-12 w-12 rounded-full border-2 border-white shadow-md"
                              style={{ backgroundColor: rec.hex }}
                              aria-hidden
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-lg font-bold uppercase text-primary">{rec.name}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-foreground/80">
                                {rec.matchPercent}% Match
                              </p>
                              <span className="rounded-full bg-secondary/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                                {rec.matchType}
                              </span>
                            </div>
                            <p className="mt-1.5 text-sm text-foreground/75">{rec.reason}</p>
                            {rec.productCount > 0 ? (
                              <p className="mt-1 text-sm text-foreground/60">
                                {rec.productCount} Product{rec.productCount === 1 ? "" : "s"} Available
                              </p>
                            ) : (
                              <p className="mt-1 text-sm text-foreground/60">
                                No products currently available
                              </p>
                            )}
                            <div className="mt-3 flex flex-wrap gap-2">
                              {rec.productCount > 0 ? (
                                <Link href={rec.shopUrl} className="btn-primary text-xs">
                                  View Blouses
                                </Link>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setAlertColor(rec.name)}
                                  className="btn-outline text-xs"
                                >
                                  Notify Me
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : recommending ? (
                <p className="text-sm text-foreground/60">Generating blouse recommendations…</p>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <ColorUploadGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
      <ColorAlertModal
        open={alertColor != null}
        recommendedColor={alertColor ?? ""}
        onClose={() => setAlertColor(null)}
      />
    </div>
  );
}
