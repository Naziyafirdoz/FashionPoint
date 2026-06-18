"use client";

import Image from "next/image";
import { X } from "lucide-react";

type ReviewPhotoPreviewModalProps = {
  src: string | null;
  alt: string;
  onClose: () => void;
};

export function ReviewPhotoPreviewModal({ src, alt, onClose }: ReviewPhotoPreviewModalProps) {
  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Review photo preview"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] max-w-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          className="absolute -right-2 -top-2 z-10 rounded-full bg-white p-1.5 shadow-lg"
        >
          <X className="h-5 w-5" />
        </button>
        {src.startsWith("data:") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            className="max-h-[85vh] max-w-full rounded-lg object-contain"
          />
        ) : (
          <div className="relative h-[70vh] w-[min(90vw,48rem)]">
            <Image src={src} alt={alt} fill className="rounded-lg object-contain" sizes="90vw" />
          </div>
        )}
      </div>
    </div>
  );
}
