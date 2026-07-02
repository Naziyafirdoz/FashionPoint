"use client";

import { useRef } from "react";
import { CheckCircle2, Circle, ImagePlus, Upload } from "lucide-react";
import {
  IMAGE_SLOT_ORDER,
  IMAGE_SLOT_LABELS,
  type ImageSlot
} from "@/config/color-upload-slots";
import {
  COLOR_UPLOAD_ACCEPTED_TYPES_LABEL,
  COLOR_UPLOAD_MAX_IMAGES,
  formatMaxFileSizeLabel
} from "@/lib/color-upload-validation";
import type { UploadedImage } from "@/hooks/useColorExtraction";
import { ColorMatcherImageThumbnails } from "./ColorMatcherImageThumbnails";

const PHOTO_TIPS = ["Full saree", "Pallu", "Border", "Embroidery", "Close-up"] as const;

type ColorMatcherUploadPanelProps = {
  images: UploadedImage[];
  maxImages: number;
  canAddMore: boolean;
  busy: boolean;
  dragOver: boolean;
  validationError: string | null;
  onDragOver: (event: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (event: React.DragEvent) => void;
  onBrowse: (files: FileList) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onReplace: (id: string, file: File) => void;
  onSetSlot: (id: string, slot: ImageSlot) => void;
  onReanalyze: () => void;
  onReset: () => void;
  showActions: boolean;
};

export function ColorMatcherUploadPanel({
  images,
  maxImages,
  canAddMore,
  busy,
  dragOver,
  validationError,
  onDragOver,
  onDragLeave,
  onDrop,
  onBrowse,
  onRemove,
  onMove,
  onReplace,
  onSetSlot,
  onReanalyze,
  onReset,
  showActions
}: ColorMatcherUploadPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bySlot = new Map<ImageSlot, UploadedImage>();
  images.forEach((img) => bySlot.set(img.slot, img));

  return (
    <section
      aria-label="Saree photo upload"
      className="rounded-[16px] border border-[#F2E4E8] bg-white p-3 shadow-[0_2px_16px_rgba(122,13,43,0.04)] sm:p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-primary">Saree Upload</h2>
        <span className="rounded-full bg-[#FFF0F3] px-2 py-0.5 text-[11px] font-semibold text-primary">
          {images.length}/{maxImages}
        </span>
      </div>

      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`mt-2 rounded-[12px] border-2 border-dashed p-3 text-center transition-colors ${
          dragOver
            ? "border-primary bg-[#FFF5F7]"
            : busy
              ? "border-[#F2E4E8] bg-[#FAFAFA] opacity-90"
              : "border-[#E8D4DA] bg-[#FFFBFC]"
        }`}
      >
        <Upload className="mx-auto h-6 w-6 text-primary/80" aria-hidden="true" />
        <p className="mt-1.5 text-xs font-semibold text-foreground/85">Drag &amp; drop</p>
        <button
          type="button"
          disabled={!canAddMore || busy}
          onClick={() => fileInputRef.current?.click()}
          className="btn-primary mt-2 inline-flex h-8 items-center gap-1.5 px-4 text-xs disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
          Browse Files
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          disabled={!canAddMore || busy}
          aria-label="Choose saree photos"
          onChange={(event) => {
            if (event.target.files?.length) onBrowse(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-foreground/55">
        Max {COLOR_UPLOAD_MAX_IMAGES} images · {COLOR_UPLOAD_ACCEPTED_TYPES_LABEL} ·{" "}
        {formatMaxFileSizeLabel()}
      </p>

      <div className="mt-2 flex flex-wrap gap-1" aria-label="Supported photo types">
        {PHOTO_TIPS.map((tip) => (
          <span
            key={tip}
            className="rounded-full border border-[#F3E5E8] px-2 py-0.5 text-[10px] text-foreground/65"
          >
            {tip}
          </span>
        ))}
      </div>

      {!images.length ? (
        <ul className="mt-2 space-y-1 text-[11px] text-foreground/55">
          {IMAGE_SLOT_ORDER.map((slot) => (
            <li key={slot} className="inline-flex items-center gap-1.5">
              <Circle className="h-3 w-3 shrink-0 text-foreground/25" aria-hidden="true" />
              <span>
                {IMAGE_SLOT_LABELS[slot]}
                {slot === "full-saree" ? (
                  <span className="ml-1 font-semibold text-primary">(Required)</span>
                ) : (
                  <span className="ml-1 text-foreground/45">(Optional)</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-2 text-[11px]">
          {IMAGE_SLOT_ORDER.map((slot) => {
            const filled = bySlot.has(slot);
            return (
              <li key={slot} className="inline-flex items-center gap-1 text-foreground/60">
                {filled ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" aria-hidden="true" />
                ) : (
                  <Circle className="h-3 w-3 text-foreground/25" aria-hidden="true" />
                )}
                {IMAGE_SLOT_LABELS[slot]}
                {slot === "full-saree" ? (
                  <span className="text-primary">*</span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {images.length ? (
        <ColorMatcherImageThumbnails
          images={images}
          busy={busy}
          onRemove={onRemove}
          onMove={onMove}
          onReplace={onReplace}
          onSetSlot={onSetSlot}
        />
      ) : null}

      {validationError ? (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-800" role="alert">
          {validationError}
        </p>
      ) : null}

      {showActions ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#F2E4E8] pt-3">
          <button
            type="button"
            disabled={busy}
            onClick={onReanalyze}
            className="btn-outline h-8 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reanalyze
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onReset}
            className="text-xs text-foreground/55 underline-offset-2 hover:text-primary hover:underline disabled:opacity-60"
          >
            Start Over
          </button>
        </div>
      ) : null}
    </section>
  );
}
