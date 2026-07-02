"use client";

import { useRef } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, RefreshCw, Trash2 } from "lucide-react";
import {
  IMAGE_SLOT_LABELS,
  IMAGE_SLOT_ORDER,
  type ImageSlot
} from "@/config/color-upload-slots";
import type { UploadedImage } from "@/hooks/useColorExtraction";

type ColorMatcherImageThumbnailsProps = {
  images: UploadedImage[];
  busy?: boolean;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onReplace: (id: string, file: File) => void;
  onSetSlot: (id: string, slot: ImageSlot) => void;
};

const STATUS_LABELS: Record<UploadedImage["status"], string> = {
  pending: "Ready to analyze",
  uploading: "Uploading…",
  ready: "Uploaded",
  error: "Upload failed"
};

export function ColorMatcherImageThumbnails({
  images,
  busy,
  onRemove,
  onMove,
  onReplace,
  onSetSlot
}: ColorMatcherImageThumbnailsProps) {
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceTargetRef = useRef<string | null>(null);

  const openReplace = (id: string) => {
    replaceTargetRef.current = id;
    replaceInputRef.current?.click();
  };

  return (
    <div className="mt-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/50">Photos</p>
      <ul className="mt-2 space-y-2">
        {images.map((image, index) => (
          <li
            key={image.id}
            className="rounded-[10px] border border-[#F2E4E8] bg-[#FFFBFC] p-2"
          >
            <div className="flex gap-2">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[#F3E5E8] bg-[#FAFAFA]">
                <Image
                  src={image.previewUrl}
                  alt={`${IMAGE_SLOT_LABELS[image.slot]} saree photo`}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="min-w-0 flex-1">
                <label className="sr-only" htmlFor={`slot-${image.id}`}>
                  Photo type for image {index + 1}
                </label>
                <select
                  id={`slot-${image.id}`}
                  value={image.slot}
                  disabled={busy}
                  onChange={(event) => onSetSlot(image.id, event.target.value as ImageSlot)}
                  className="w-full rounded-lg border border-[#F2E4E8] bg-[#FFFBFC] px-2 py-1.5 text-xs font-medium text-foreground/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {IMAGE_SLOT_ORDER.map((slot) => (
                    <option key={slot} value={slot}>
                      {IMAGE_SLOT_LABELS[slot]}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-[11px] text-foreground/55" aria-live="polite">
                  {image.status === "uploading"
                    ? `${STATUS_LABELS.uploading} ${image.progress}%`
                    : STATUS_LABELS[image.status]}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <button
                    type="button"
                    aria-label={`Replace ${IMAGE_SLOT_LABELS[image.slot]} photo`}
                    disabled={busy}
                    onClick={() => openReplace(image.id)}
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-primary hover:bg-[#FFF5F7] disabled:opacity-40"
                  >
                    <RefreshCw className="h-3 w-3" aria-hidden="true" />
                    Replace
                  </button>
                  <button
                    type="button"
                    aria-label="Move photo earlier"
                    disabled={busy || index === 0}
                    onClick={() => onMove(image.id, -1)}
                    className="rounded-md p-0.5 text-foreground/50 hover:bg-[#FFF5F7] hover:text-primary disabled:opacity-30"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Move photo later"
                    disabled={busy || index === images.length - 1}
                    onClick={() => onMove(image.id, 1)}
                    className="rounded-md p-0.5 text-foreground/50 hover:bg-[#FFF5F7] hover:text-primary disabled:opacity-30"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${IMAGE_SLOT_LABELS[image.slot]} photo`}
                    disabled={busy}
                    onClick={() => onRemove(image.id)}
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-red-700 hover:bg-red-50 disabled:opacity-40"
                  >
                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <input
        ref={replaceInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        aria-hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          const targetId = replaceTargetRef.current;
          if (file && targetId) onReplace(targetId, file);
          event.target.value = "";
          replaceTargetRef.current = null;
        }}
      />
    </div>
  );
}
