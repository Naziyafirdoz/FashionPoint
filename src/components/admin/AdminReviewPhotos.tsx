"use client";

import { useState } from "react";
import { AdminProductThumbnail } from "@/components/admin/AdminProductThumbnail";
import { ReviewPhotoPreviewModal } from "@/components/reviews/ReviewPhotoPreviewModal";

export function AdminReviewPhotos({ images }: { images: string[] }) {
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [previewAlt, setPreviewAlt] = useState("");

  if (images.length === 0) {
    return <span className="text-xs text-foreground/50">No Photos</span>;
  }

  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {images.slice(0, 4).map((src, index) => (
          <button
            key={`${src}-${index}`}
            type="button"
            className="rounded-lg transition hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-primary/40"
            onClick={() => {
              setPreviewSrc(src);
              setPreviewAlt(`Review photo ${index + 1}`);
            }}
            aria-label={`Preview review photo ${index + 1}`}
          >
            <AdminProductThumbnail src={src} alt={`Review photo ${index + 1}`} />
          </button>
        ))}
        {images.length > 4 ? (
          <span className="self-center text-xs text-foreground/50">+{images.length - 4}</span>
        ) : null}
      </div>
      <ReviewPhotoPreviewModal
        src={previewSrc}
        alt={previewAlt}
        onClose={() => setPreviewSrc(null)}
      />
    </>
  );
}
