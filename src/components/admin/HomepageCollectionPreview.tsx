"use client";

import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { getCategoryUrlOrNull } from "@/lib/categories/category-url";

const HOMEPAGE_THEME_GRADIENTS: Record<string, string> = {
  blush: "linear-gradient(160deg, #FFF0F3 0%, #FFE4EC 100%)",
  rose: "linear-gradient(160deg, #FFF0F5 0%, #FFE0EA 100%)",
  peach: "linear-gradient(160deg, #FFF5F0 0%, #FFE8DC 100%)",
  cream: "linear-gradient(160deg, #FFFBF4 0%, #F8F0E4 100%)",
  gold: "linear-gradient(160deg, #FBF6EE 0%, #F2E8D4 100%)",
  lavender: "linear-gradient(160deg, #F7F2FF 0%, #EDE4FF 100%)",
  lilac: "linear-gradient(160deg, #F8F3FF 0%, #EAE0FF 100%)",
  sky: "linear-gradient(160deg, #EFF8FF 0%, #E0F0FF 100%)",
  mint: "linear-gradient(160deg, #F0FAF8 0%, #E2F2EE 100%)",
  sage: "linear-gradient(160deg, #F2F7F2 0%, #E4EEE4 100%)",
  coral: "linear-gradient(160deg, #FFF3F0 0%, #FFE4DC 100%)",
  pearl: "linear-gradient(160deg, #FFFCFA 0%, #F5F0EC 100%)",
  sand: "linear-gradient(160deg, #FAF6F1 0%, #F0E8DC 100%)",
  maroon: "linear-gradient(160deg, #FBF0F3 0%, #F3E0E6 100%)",
  emerald: "linear-gradient(160deg, #EFF8F4 0%, #DCEFE6 100%)"
};

export type HomepageCollectionPreviewProps = {
  title: string;
  description: string;
  buttonText: string;
  theme: string;
  bannerImageUrl: string;
  slug: string;
};

export function HomepageCollectionPreview({
  title,
  description,
  buttonText,
  theme,
  bannerImageUrl,
  slug
}: HomepageCollectionPreviewProps) {
  const themeKey = theme.trim().toLowerCase() || "blush";
  const fallbackBackground =
    HOMEPAGE_THEME_GRADIENTS[themeKey] ?? HOMEPAGE_THEME_GRADIENTS.blush;
  const previewTitle = title.trim() || "Category Name";
  const previewDescription =
    description.trim() || "Short description shown on homepage card...";
  const previewButton = buttonText.trim() || "Explore Collection";
  const hasBanner = Boolean(bannerImageUrl.trim());
  const previewHref = getCategoryUrlOrNull(slug);
  const isInteractive = hasBanner && Boolean(previewHref);

  const previewBody = (
    <div
      className={`relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-black/[0.08] shadow-[0_8px_28px_rgba(123,13,43,0.1)] ${
        isInteractive
          ? "transition-[transform,box-shadow] duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_14px_36px_rgba(123,13,43,0.16)]"
          : ""
      }`}
    >
      {hasBanner ? (
        bannerImageUrl.startsWith("data:") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bannerImageUrl}
            alt={`${previewTitle} homepage banner`}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <Image
            src={bannerImageUrl}
            alt={`${previewTitle} homepage banner`}
            fill
            sizes="(max-width: 768px) 100vw, 640px"
            className="object-cover"
            unoptimized={bannerImageUrl.startsWith("data:")}
          />
        )
      ) : (
        <div className="absolute inset-0" style={{ background: fallbackBackground }} aria-hidden="true" />
      )}

      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-black/5"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent"
        aria-hidden="true"
      />

      <div className="relative z-10 flex h-full min-h-0 flex-col justify-end p-4 sm:p-6">
        <div className="max-w-[min(100%,28rem)]">
          <p className="font-display text-lg font-bold leading-tight text-white sm:text-xl md:text-2xl">
            {previewTitle}
          </p>
          <div className="mt-2 h-[2px] w-10 rounded-full bg-white/50" aria-hidden="true" />
          <p className="mt-2 line-clamp-3 text-xs leading-snug text-white/85 sm:text-sm">
            {previewDescription}
          </p>
          <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white sm:text-[11px]">
            {previewButton}
            <span aria-hidden="true">→</span>
          </span>
        </div>
      </div>

      {isInteractive ? (
        <span className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-medium text-white opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100 sm:text-xs">
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
          Open category
        </span>
      ) : null}
    </div>
  );

  return (
    <div className="rounded-xl border border-accent/20 bg-white p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
          Live Preview
        </p>
        {isInteractive ? (
          <p className="text-[10px] text-foreground/45 sm:text-xs">Click preview to open category</p>
        ) : null}
      </div>

      {isInteractive ? (
        <a
          href={previewHref!}
          target="_blank"
          rel="noopener noreferrer"
          className="group block cursor-pointer rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          aria-label={`Open ${previewTitle} category page in a new tab`}
        >
          {previewBody}
        </a>
      ) : (
        previewBody
      )}

      {!hasBanner ? (
        <p className="mt-3 text-center text-xs leading-snug text-foreground/50">
          No banner uploaded yet. Upload a homepage banner to preview.
        </p>
      ) : null}
    </div>
  );
}
