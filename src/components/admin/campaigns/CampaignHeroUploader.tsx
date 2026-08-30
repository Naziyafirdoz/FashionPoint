"use client";

import { useCallback, useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { CAMPAIGN_MAX_UPLOAD_BYTES } from "@/lib/campaigns/campaign-image-upload";

const FILE_ACCEPT = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type UploadPhase = "idle" | "uploading" | "complete" | "failed";

type CampaignHeroUploaderProps = {
  imageUrl: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  emptyStateTitle: string;
  recommendedSize: string;
  aspectHint: string;
  previewAlt: string;
  previewAspectClass: string;
};

function isAllowedImage(file: File): boolean {
  const mime = file.type.toLowerCase();
  if (ALLOWED_MIME_TYPES.has(mime)) return true;
  return /\.(jpe?g|png|webp)$/i.test(file.name);
}

function validateFile(file: File): string | null {
  if (!isAllowedImage(file)) return "Please upload a JPG, PNG, or WEBP image only.";
  if (file.size > CAMPAIGN_MAX_UPLOAD_BYTES) return "Maximum file size is 10 MB.";
  return null;
}

async function uploadCampaignImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/admin/campaigns/upload", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || typeof data.url !== "string" || !data.url) {
    throw new Error(data.error ?? "Upload failed");
  }
  return data.url as string;
}

export function CampaignHeroUploader({
  imageUrl,
  onChange,
  disabled = false,
  emptyStateTitle,
  recommendedSize,
  aspectHint,
  previewAlt,
  previewAspectClass
}: CampaignHeroUploaderProps) {
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = phase === "uploading";
  const hasImage = Boolean(imageUrl.trim());

  const processFile = useCallback(
    async (file: File | null | undefined) => {
      if (!file || disabled) return;
      const error = validateFile(file);
      if (error) {
        toast.error(error);
        return;
      }

      setPhase("uploading");
      try {
        const url = await uploadCampaignImage(file);
        onChange(url);
        setPhase("complete");
      } catch (err) {
        setPhase("failed");
        toast.error(err instanceof Error ? err.message : "Failed to upload campaign image");
      } finally {
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [disabled, onChange]
  );

  const openPicker = () => {
    if (!disabled && !busy) inputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={FILE_ACCEPT}
        className="hidden"
        disabled={disabled || busy}
        onChange={(event) => {
          void processFile(event.target.files?.[0]);
        }}
      />

      {phase === "uploading" ? (
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-medium text-primary">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Uploading…
        </div>
      ) : null}

      {hasImage ? (
        <div className="space-y-3">
          <div className={`relative overflow-hidden rounded-lg border bg-white ${previewAspectClass}`}>
            <img src={imageUrl} alt={previewAlt} className="h-full w-full object-cover object-center" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openPicker}
              disabled={disabled || busy}
              className="btn-outline px-3 py-1.5 text-xs disabled:opacity-50"
            >
              Change image
            </button>
            <button
              type="button"
              onClick={() => {
                onChange("");
                setPhase("idle");
              }}
              disabled={disabled || busy}
              className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50 disabled:opacity-50"
            >
              Remove image
            </button>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          onClick={openPicker}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openPicker();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled && !busy) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            void processFile(event.dataTransfer.files?.[0]);
          }}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 py-6 text-center ${
            disabled
              ? "cursor-not-allowed opacity-50"
              : dragOver
                ? "border-primary bg-primary/5"
                : "border-accent/40 bg-white/70 hover:border-primary/40"
          }`}
        >
          <Upload className="h-6 w-6 text-foreground/40" />
          <p className="mt-2 text-sm font-semibold text-foreground/70">{emptyStateTitle}</p>
          <p className="mt-2 text-xs text-foreground/50">Recommended</p>
          <p className="text-xs font-medium text-foreground/60">{recommendedSize}</p>
          <p className="mt-1 text-xs text-foreground/50">{aspectHint}</p>
          <p className="mt-1 text-xs text-foreground/50">JPG / PNG / WEBP · Max 10 MB</p>
        </div>
      )}
    </div>
  );
}
