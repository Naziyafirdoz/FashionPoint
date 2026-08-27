"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { optimizeHomepageBannerImage } from "@/lib/admin/optimize-homepage-banner-image";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const FILE_ACCEPT = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type BannerUploadMeta = {
  format: string;
  width: number;
  height: number;
  fileSizeBytes: number;
  storage: string;
};

export type BannerUploadSummary = {
  original: { width: number; height: number; fileSizeBytes: number };
  uploaded: { width: number; height: number; fileSizeBytes: number };
};

type UploadPhase = "idle" | "optimizing" | "uploading" | "complete" | "failed";

type HomepageBannerUploaderProps = {
  imageUrl: string;
  onChange: (url: string) => void;
  onUploadMetaChange?: (meta: BannerUploadMeta | null) => void;
  onUploadSummaryChange?: (summary: BannerUploadSummary | null) => void;
  disabled?: boolean;
  emptyStateTitle?: string;
  removeDialogTitle?: string;
  removeDialogDescription?: string;
  previewAlt?: string;
  previewAspectClass?: string;
  recommendedSize?: string;
  aspectRatioLabel?: string;
};

function isAllowedBannerImage(file: File): boolean {
  const mime = file.type.toLowerCase();
  if (ALLOWED_MIME_TYPES.has(mime)) return true;
  return /\.(jpe?g|png|webp)$/i.test(file.name);
}

function validateBannerFile(file: File): string | null {
  if (!isAllowedBannerImage(file)) {
    return "Please upload a JPG, JPEG, PNG, or WEBP image only.";
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "Maximum file size is 10 MB.";
  }
  return null;
}

function formatFromMime(mime: string): string {
  if (mime.includes("png")) return "PNG";
  if (mime.includes("webp")) return "WEBP";
  return "JPEG";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function detectStorage(url: string): string {
  if (url.startsWith("data:")) return "Local Development";
  if (/cloudinary\.com/i.test(url)) return "Cloudinary";
  if (/supabase/i.test(url)) return "Supabase Storage";
  if (/amazonaws\.com|\.s3\./i.test(url)) return "Amazon S3";
  if (/utfs\.io|uploadthing/i.test(url)) return "UploadThing";
  return "Remote Storage";
}

async function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const dimensions = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return dimensions;
}

async function uploadBannerImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload/image", { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok || !data.url) {
    throw new Error(data.error ?? "Upload failed");
  }
  return data.url as string;
}

function uploadPhaseLabel(phase: UploadPhase): string | null {
  switch (phase) {
    case "optimizing":
      return "Optimizing…";
    case "uploading":
      return "Uploading…";
    case "complete":
      return "Upload Complete";
    case "failed":
      return "Upload Failed";
    default:
      return null;
  }
}

function UploadStatus({ phase }: { phase: UploadPhase }) {
  const label = uploadPhaseLabel(phase);
  if (!label) return null;

  const tone =
    phase === "complete"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : phase === "failed"
        ? "border-red-200 bg-red-50 text-red-800"
        : "border-primary/20 bg-primary/5 text-primary";

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${tone}`}
      role="status"
      aria-live="polite"
    >
      {phase === "optimizing" || phase === "uploading" ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden="true" />
      ) : null}
      <span>{label}</span>
    </div>
  );
}

function UploadSummaryPanel({ summary }: { summary: BannerUploadSummary }) {
  const reduction =
    summary.original.fileSizeBytes > 0
      ? Math.max(
          0,
          Math.round(
            (1 - summary.uploaded.fileSizeBytes / summary.original.fileSizeBytes) * 100
          )
        )
      : 0;

  return (
    <div className="rounded-lg border border-accent/20 bg-blush/30 px-3 py-3 text-xs text-foreground/75">
      <p className="font-semibold text-foreground/85">Optimization Complete</p>
      <div className="mt-2 space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-foreground/55">Original</span>
          <span className="font-medium">
            {summary.original.width} × {summary.original.height}
          </span>
          <span className="text-foreground/45">({formatFileSize(summary.original.fileSizeBytes)})</span>
        </div>
        <p className="text-center text-foreground/40" aria-hidden="true">
          ↓
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-foreground/55">Uploaded</span>
          <span className="font-medium">
            {summary.uploaded.width} × {summary.uploaded.height}
          </span>
          <span className="text-foreground/45">
            ({formatFileSize(summary.uploaded.fileSizeBytes)})
          </span>
        </div>
        {reduction > 0 ? (
          <p className="pt-1 text-foreground/60">
            Approximate file reduction: <span className="font-semibold text-foreground/80">{reduction}%</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

function RemoveBannerDialog({
  open,
  onCancel,
  onConfirm,
  title,
  description
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close remove banner dialog"
        className="absolute inset-0 bg-black/40"
        onClick={onCancel}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="remove-banner-title"
        aria-describedby="remove-banner-description"
        className="relative z-10 w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
      >
        <h3 id="remove-banner-title" className="font-display text-base font-bold text-primary">
          {title}
        </h3>
        <p id="remove-banner-description" className="mt-2 text-sm text-foreground/65">
          {description}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="btn-outline px-4 py-2 text-sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

export function HomepageBannerUploader({
  imageUrl,
  onChange,
  onUploadMetaChange,
  onUploadSummaryChange,
  disabled = false,
  emptyStateTitle = "Homepage Banner",
  removeDialogTitle = "Remove Homepage Banner?",
  removeDialogDescription = "This only removes the banner from this category.",
  previewAlt = "Uploaded homepage banner thumbnail",
  previewAspectClass = "aspect-[16/10]",
  recommendedSize = "1200 × 600",
  aspectRatioLabel
}: HomepageBannerUploaderProps) {
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>("idle");
  const [uploadSummary, setUploadSummary] = useState<BannerUploadSummary | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isBusy = uploadPhase === "optimizing" || uploadPhase === "uploading";
  const hasImage = Boolean(imageUrl.trim());

  const clearUploadDetails = useCallback(() => {
    setUploadSummary(null);
    onUploadMetaChange?.(null);
    onUploadSummaryChange?.(null);
    setUploadPhase("idle");
  }, [onUploadMetaChange, onUploadSummaryChange]);

  const processFile = useCallback(
    async (file: File | null | undefined) => {
      if (!file || disabled) return;

      const validationError = validateBannerFile(file);
      if (validationError) {
        toast.error(validationError);
        return;
      }

      setUploadPhase("optimizing");
      try {
        const originalDimensions = await readImageDimensions(file);
        const originalFileSizeBytes = file.size;

        let optimizedFile: File;
        try {
          optimizedFile = await optimizeHomepageBannerImage(file);
        } catch {
          setUploadPhase("failed");
          toast.error("Failed to optimize image.");
          return;
        }

        const uploadedDimensions = await readImageDimensions(optimizedFile);
        const uploadedFileSizeBytes = optimizedFile.size;

        setUploadPhase("uploading");
        const url = await uploadBannerImage(optimizedFile);

        const summary: BannerUploadSummary = {
          original: {
            width: originalDimensions.width,
            height: originalDimensions.height,
            fileSizeBytes: originalFileSizeBytes
          },
          uploaded: {
            width: uploadedDimensions.width,
            height: uploadedDimensions.height,
            fileSizeBytes: uploadedFileSizeBytes
          }
        };

        const meta: BannerUploadMeta = {
          format: formatFromMime(optimizedFile.type),
          width: uploadedDimensions.width,
          height: uploadedDimensions.height,
          fileSizeBytes: uploadedFileSizeBytes,
          storage: detectStorage(url)
        };

        onChange(url);
        onUploadMetaChange?.(meta);
        onUploadSummaryChange?.(summary);
        setUploadSummary(summary);
        setUploadPhase("complete");
      } catch {
        setUploadPhase("failed");
        toast.error("Failed to upload banner image");
      } finally {
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [disabled, onChange, onUploadMetaChange, onUploadSummaryChange]
  );

  const openFilePicker = () => {
    if (!disabled && !isBusy) inputRef.current?.click();
  };

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setDragOver(false);
      if (disabled || isBusy) return;
      const file = event.dataTransfer.files?.[0];
      void processFile(file);
    },
    [disabled, isBusy, processFile]
  );

  const handleRemove = () => {
    onChange("");
    clearUploadDetails();
    setRemoveDialogOpen(false);
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={FILE_ACCEPT}
        className="hidden"
        disabled={disabled || isBusy}
        onChange={(event) => {
          void processFile(event.target.files?.[0]);
        }}
      />

      <UploadStatus phase={uploadPhase} />

      {uploadSummary ? <UploadSummaryPanel summary={uploadSummary} /> : null}

      {hasImage ? (
        <div className="space-y-3">
          <div
            className={`relative ${previewAspectClass} overflow-hidden rounded-lg border bg-white ${
              dragOver ? "ring-2 ring-primary/30" : ""
            }`}
            onDragOver={(event) => {
              event.preventDefault();
              if (!disabled && !isBusy) setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            {imageUrl.startsWith("data:") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={previewAlt}
                className="h-full w-full object-cover"
              />
            ) : (
              <Image
                src={imageUrl}
                alt={previewAlt}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 400px"
                unoptimized={imageUrl.startsWith("data:")}
              />
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openFilePicker}
              disabled={disabled || isBusy}
              className="btn-outline px-3 py-1.5 text-xs disabled:opacity-50"
            >
              {isBusy ? uploadPhaseLabel(uploadPhase) : "Change Banner"}
            </button>
            <button
              type="button"
              onClick={() => setRemoveDialogOpen(true)}
              disabled={disabled || isBusy}
              className="rounded-full border border-accent/30 px-3 py-1.5 text-xs font-semibold text-foreground/70 transition hover:border-primary/30 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
            >
              Remove Banner
            </button>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(event) => {
            if (disabled || isBusy) return;
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openFilePicker();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled && !isBusy) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={openFilePicker}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 py-6 text-center transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
            disabled
              ? "cursor-not-allowed opacity-50"
              : dragOver
                ? "border-primary bg-primary/5"
                : "border-accent/40 bg-white/70 hover:border-primary/40"
          }`}
        >
          <Upload
            className={`h-6 w-6 text-foreground/40 ${isBusy ? "animate-pulse" : ""}`}
            aria-hidden="true"
          />
          <p className="mt-2 text-sm font-semibold text-foreground/70">{emptyStateTitle}</p>
          <p className="mt-2 text-xs text-foreground/50">Recommended Size</p>
          <p className="text-xs font-medium text-foreground/60">{recommendedSize}</p>
          {aspectRatioLabel ? (
            <p className="mt-1 text-xs font-medium text-foreground/60">{aspectRatioLabel}</p>
          ) : null}
          <p className="mt-1 text-xs text-foreground/50">PNG / JPG / WEBP</p>
          <p className="text-xs text-foreground/50">Maximum 10 MB</p>
          <p className="mt-3 text-xs font-medium text-primary/80">
            {isBusy ? uploadPhaseLabel(uploadPhase) : "Drag & Drop or Browse Files"}
          </p>
        </div>
      )}

      <RemoveBannerDialog
        open={removeDialogOpen}
        onCancel={() => setRemoveDialogOpen(false)}
        onConfirm={handleRemove}
        title={removeDialogTitle}
        description={removeDialogDescription}
      />
    </div>
  );
}

export { formatFileSize, detectStorage, formatFromMime };
