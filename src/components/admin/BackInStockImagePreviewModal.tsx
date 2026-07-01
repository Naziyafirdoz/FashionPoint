"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";

type BackInStockImagePreviewModalProps = {
  open: boolean;
  src: string;
  alt: string;
  onClose: () => void;
};

export function BackInStockImagePreviewModal({
  open,
  src,
  alt,
  onClose
}: BackInStockImagePreviewModalProps) {
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!open) {
      setVisible(false);
      setLoaded(false);
      return;
    }

    setLoaded(false);
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [open, src]);

  const handleClose = useCallback(() => {
    setVisible(false);
    window.setTimeout(onClose, 200);
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, handleClose]);

  if (!open) return null;

  const isDataUrl = src.startsWith("data:");

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 transition-opacity duration-200 ease-out ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      role="dialog"
      aria-modal="true"
      aria-label={`Preview: ${alt}`}
      onClick={handleClose}
    >
      <button
        type="button"
        onClick={handleClose}
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        aria-label="Close preview"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>

      <div
        className={`relative w-full max-w-2xl transition-all duration-200 ease-out ${
          visible ? "scale-100 opacity-100" : "scale-[0.98] opacity-0"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative mx-auto aspect-square w-full max-h-[min(85vh,640px)] max-w-lg overflow-hidden rounded-xl bg-white/5">
          {!loaded ? (
            <div
              className="absolute inset-0 animate-pulse rounded-xl bg-white/10"
              aria-hidden="true"
            />
          ) : null}

          {isDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={alt}
              onLoad={() => setLoaded(true)}
              className={`h-full w-full object-contain transition-opacity duration-300 ${
                loaded ? "opacity-100" : "opacity-0"
              }`}
            />
          ) : (
            <Image
              src={src}
              alt={alt}
              fill
              className={`object-contain transition-opacity duration-300 ${
                loaded ? "opacity-100" : "opacity-0"
              }`}
              sizes="(max-width: 768px) 100vw, 512px"
              priority
              onLoad={() => setLoaded(true)}
            />
          )}
        </div>

        <p className="mt-3 text-center text-sm font-medium text-white/90">{alt}</p>
      </div>
    </div>
  );
}
