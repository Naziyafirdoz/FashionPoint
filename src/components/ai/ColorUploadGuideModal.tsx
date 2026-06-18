"use client";

import { Check, X } from "lucide-react";
import { ColorUploadGuideDiagram } from "./ColorUploadGuideDiagrams";

type ColorUploadGuideModalProps = {
  open: boolean;
  onClose: () => void;
};

const PHOTO_GUIDES = [
  {
    variant: "full-saree" as const,
    title: "Full Saree",
    instruction: "Upload the complete saree clearly."
  },
  {
    variant: "pallu" as const,
    title: "Pallu",
    instruction: "Show the decorative pallu area."
  },
  {
    variant: "border" as const,
    title: "Border",
    instruction: "Capture the border embroidery closely."
  },
  {
    variant: "embroidery" as const,
    title: "Embroidery",
    instruction: "Take a close-up of zari or thread work."
  }
];

export function ColorUploadGuideModal({ open, onClose }: ColorUploadGuideModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        role="dialog"
        aria-labelledby="color-upload-guide-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="color-upload-guide-title" className="font-display text-2xl font-bold text-primary">
              How To Upload Saree Photos
            </h2>
            <p className="mt-1 text-sm text-foreground/70">
              Follow these simple visuals — you will understand in 2 seconds.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-foreground/60 hover:bg-blush"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {PHOTO_GUIDES.map((guide) => (
            <article
              key={guide.title}
              className="overflow-hidden rounded-2xl border border-accent/20 bg-blush/10"
            >
              <div className="bg-blush/30 p-3">
                <ColorUploadGuideDiagram variant={guide.variant} className="h-40 w-full sm:h-44" />
              </div>
              <div className="px-4 py-3">
                <h3 className="font-display text-lg font-bold text-primary">{guide.title}</h3>
                <p className="mt-1 text-sm text-foreground/80">{guide.instruction}</p>
              </div>
            </article>
          ))}
        </div>

        <article className="mt-4 overflow-hidden rounded-2xl border border-accent/20">
          <div className="bg-blush/30 p-3">
            <ColorUploadGuideDiagram variant="lighting" className="h-44 w-full" />
          </div>
          <div className="grid gap-4 px-4 py-4 sm:grid-cols-2">
            <div>
              <p className="font-display text-lg font-bold text-primary">Lighting</p>
              <p className="mt-2 text-sm font-semibold text-green-800">Good</p>
              <ul className="mt-2 space-y-1.5 text-sm text-foreground/80">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-green-600" />
                  Daylight
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-green-600" />
                  Plain Background
                </li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-red-700 sm:mt-9">Bad</p>
              <ul className="mt-2 space-y-1.5 text-sm text-foreground/80">
                <li className="flex items-center gap-2">
                  <X className="h-4 w-4 shrink-0 text-red-600" />
                  Dark Room
                </li>
                <li className="flex items-center gap-2">
                  <X className="h-4 w-4 shrink-0 text-red-600" />
                  Flash Glare
                </li>
              </ul>
            </div>
          </div>
        </article>

        <button type="button" onClick={onClose} className="btn-primary mt-6 w-full">
          Got it — let me upload
        </button>
      </div>
    </div>
  );
}
