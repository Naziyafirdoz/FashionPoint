"use client";

import { useCallback, useEffect } from "react";
import Image from "next/image";

type OrderProductImageLightboxProps = {
  images: { src: string; alt: string }[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
};

export function OrderProductImageLightbox({
  images,
  index,
  onClose,
  onIndexChange
}: OrderProductImageLightboxProps) {
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;
  const current = images[index];

  const goPrev = useCallback(() => {
    if (hasPrev) onIndexChange(index - 1);
  }, [hasPrev, index, onIndexChange]);

  const goNext = useCallback(() => {
    if (hasNext) onIndexChange(index + 1);
  }, [hasNext, index, onIndexChange]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, goPrev, goNext]);

  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Product image preview"
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20"
        onClick={onClose}
      >
        Close
      </button>

      {hasPrev ? (
        <button
          type="button"
          className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-white hover:bg-white/20 sm:left-4"
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          aria-label="Previous image"
        >
          ‹
        </button>
      ) : null}

      <div
        className="relative max-h-[85vh] w-full max-w-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative mx-auto aspect-square max-h-[85vh] w-full max-w-lg">
          <Image
            src={current.src}
            alt={current.alt}
            fill
            className="rounded-lg object-contain"
            sizes="(max-width: 768px) 100vw, 512px"
            priority
          />
        </div>
        {images.length > 1 ? (
          <p className="mt-3 text-center text-sm text-white/80">
            {index + 1} / {images.length}
          </p>
        ) : null}
      </div>

      {hasNext ? (
        <button
          type="button"
          className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-white hover:bg-white/20 sm:right-4"
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          aria-label="Next image"
        >
          ›
        </button>
      ) : null}
    </div>
  );
}
