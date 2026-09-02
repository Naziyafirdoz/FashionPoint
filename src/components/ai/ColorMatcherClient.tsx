"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useColorExtraction } from "@/hooks/useColorExtraction";
import { useColorRecommendations } from "@/hooks/useColorRecommendations";
import { ColorUploadGuideModal } from "./ColorUploadGuideModal";
import { ColorMatcherHero } from "./color-matcher/ColorMatcherHero";
import { ColorMatcherUploadPanel } from "./color-matcher/ColorMatcherUploadPanel";
import { ColorMatcherResultsPanel } from "./color-matcher/ColorMatcherResultsPanel";

const AUTO_ANALYZE_DELAY_MS = 400;

export function ColorMatcherClient({ storeName }: { storeName: string }) {
  const analyzingRef = useRef(false);
  const runAnalysisRef = useRef<() => Promise<void>>(async () => {});
  const [guideOpen, setGuideOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string | null>(null);

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
    setImageSlot,
    replaceImage,
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

  const imagesFingerprint = useMemo(
    () => images.map((img) => `${img.id}:${img.slot}:${img.file.lastModified}`).join("|"),
    [images]
  );

  const runAnalysis = useCallback(async () => {
    if (!images.length || analyzingRef.current) return;

    const hasFullSaree = images.some((image) => image.slot === "full-saree");
    if (!hasFullSaree) {
      setExtractionError(
        "A Full Saree photo is required. Pallu, Border, Embroidery, and Close-up photos are optional but can improve accuracy."
      );
      return;
    }

    analyzingRef.current = true;
    setExtractionError(null);
    setRecommendationError(null);
    resetRecommendations();
    setAnalysisStep("Analyzing saree…");

    try {
      const imageUrls = await uploadImages();
      if (!imageUrls.length) return;

      setAnalysisStep("Detecting colors…");
      const colors = await extractColors();
      if (!colors.length) return;

      setAnalysisStep("Finding matching blouse colors…");
      await fetchRecommendations(imageUrls, colors);
    } finally {
      analyzingRef.current = false;
      setAnalysisStep(null);
    }
  }, [
    images,
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
      if (!busy && event.dataTransfer.files?.length) {
        await handleFiles(event.dataTransfer.files);
      }
    },
    [busy, handleFiles]
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

  const handleReplaceImage = useCallback(
    async (id: string, file: File) => {
      await replaceImage(id, file);
      resetRecommendations();
    },
    [replaceImage, resetRecommendations]
  );

  const handleSetSlot = useCallback(
    (id: string, slot: import("@/config/color-upload-slots").ImageSlot) => {
      setImageSlot(id, slot);
      resetRecommendations();
    },
    [setImageSlot, resetRecommendations]
  );

  const handleReset = useCallback(() => {
    resetExtraction();
    resetRecommendations();
    setAnalysisStep(null);
  }, [resetExtraction, resetRecommendations]);

  const resultsError = recommendationError || extractionError;

  return (
    <div className="mx-auto w-full max-w-[1400px] px-3 pb-6 pt-4 sm:px-5">
      <ColorMatcherHero storeName={storeName} onOpenGuide={() => setGuideOpen(true)} />

      <div className="mt-3 grid items-start gap-3 lg:grid-cols-2 lg:gap-4">
        <ColorMatcherUploadPanel
          images={images}
          maxImages={maxImages}
          canAddMore={canAddMore}
          busy={busy}
          dragOver={dragOver}
          validationError={extractionError}
          onDragOver={(event) => {
            event.preventDefault();
            if (!busy) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onBrowse={(files) => void handleFiles(files)}
          onRemove={handleRemoveImage}
          onMove={handleMoveImage}
          onReplace={(id, file) => void handleReplaceImage(id, file)}
          onSetSlot={handleSetSlot}
          onReanalyze={() => void runAnalysis()}
          onReset={handleReset}
          showActions={images.length > 0}
        />

        <ColorMatcherResultsPanel
          images={images}
          detectedColors={detectedColors}
          result={result}
          busy={busy}
          analysisStep={analysisStep}
          error={resultsError}
          onRetry={() => void runAnalysis()}
          onReset={handleReset}
        />
      </div>

      <ColorUploadGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  );
}
