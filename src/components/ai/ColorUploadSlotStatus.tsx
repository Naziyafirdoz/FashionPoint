"use client";

import Image from "next/image";
import { ArrowDown, ArrowUp, CheckCircle2, Circle, Trash2 } from "lucide-react";
import {
  IMAGE_SLOT_ORDER,
  IMAGE_SLOT_LABELS,
  type ImageSlot
} from "@/config/color-upload-slots";
import type { UploadedImage } from "@/hooks/useColorExtraction";

type ColorUploadSlotStatusProps = {
  images: UploadedImage[];
  busy?: boolean;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
};

const SLOT_COLORS: Record<ImageSlot, string> = {
  "full-saree": "text-blue-600",
  pallu: "text-amber-600",
  border: "text-rose-600",
  embroidery: "text-violet-600",
  "close-up": "text-emerald-600"
};

export function ColorUploadSlotStatus({ images, busy, onRemove, onMove }: ColorUploadSlotStatusProps) {
  const bySlot = new Map<ImageSlot, UploadedImage>();
  images.forEach((img) => bySlot.set(img.slot, img));

  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-xl border border-accent/15 bg-blush/20 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground/55">
          Photo types
        </p>
        <ul className="mt-2 space-y-2">
          {IMAGE_SLOT_ORDER.map((slot) => {
            const image = bySlot.get(slot);
            const filled = Boolean(image);
            return (
              <li key={slot} className="flex items-center gap-2.5 text-sm">
                {filled ? (
                  <CheckCircle2 className={`h-4 w-4 shrink-0 ${SLOT_COLORS[slot]}`} />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-foreground/25" />
                )}
                <span
                  className={
                    filled ? `font-semibold ${SLOT_COLORS[slot]}` : "text-foreground/50"
                  }
                >
                  {IMAGE_SLOT_LABELS[slot]}
                </span>
                {image?.status === "uploading" ? (
                  <span className="ml-auto text-xs text-foreground/50">
                    Uploading… {image.progress}%
                  </span>
                ) : filled ? (
                  <span className="ml-auto text-xs font-medium text-green-700">Added</span>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>

      {images.length ? (
        <ul className="flex flex-wrap gap-3">
          {images.map((image, index) => (
            <li key={image.id} className="group relative flex flex-col items-center">
              <div className="relative h-16 w-16 overflow-hidden rounded-lg border-2 border-white shadow-sm ring-1 ring-accent/15">
                <Image
                  src={image.previewUrl}
                  alt={IMAGE_SLOT_LABELS[image.slot]}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <p
                className={`mt-1 max-w-[4.5rem] truncate text-center text-[10px] font-semibold ${SLOT_COLORS[image.slot]}`}
              >
                {IMAGE_SLOT_LABELS[image.slot]}
              </p>
              <div className="mt-1 flex gap-0.5">
                <button
                  type="button"
                  aria-label="Move photo earlier"
                  disabled={busy || index === 0}
                  onClick={() => onMove(image.id, -1)}
                  className="rounded p-0.5 text-foreground/50 hover:bg-blush hover:text-primary disabled:opacity-30"
                >
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  aria-label="Move photo later"
                  disabled={busy || index === images.length - 1}
                  onClick={() => onMove(image.id, 1)}
                  className="rounded p-0.5 text-foreground/50 hover:bg-blush hover:text-primary disabled:opacity-30"
                >
                  <ArrowDown className="h-3 w-3" />
                </button>
              </div>
              <button
                type="button"
                aria-label={`Remove ${IMAGE_SLOT_LABELS[image.slot]} photo`}
                disabled={busy}
                onClick={() => onRemove(image.id)}
                className="absolute -right-1 -top-1 rounded-full bg-white p-1 text-foreground/60 shadow ring-1 ring-accent/20 hover:text-primary disabled:opacity-40"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
