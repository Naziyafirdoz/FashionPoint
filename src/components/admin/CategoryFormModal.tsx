"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import {
  HomepageBannerUploader,
  type BannerUploadMeta,
  detectStorage,
  formatFileSize
} from "@/components/admin/HomepageBannerUploader";
import { HomepageCollectionPreview } from "@/components/admin/HomepageCollectionPreview";
import { slugify } from "@/lib/product-filters";
import {
  CATEGORY_DESCRIPTION_MAX_LENGTH,
  type AdminCategoryRow
} from "@/lib/admin/categories";

export type CategoryFormValues = {
  name: string;
  slug: string;
  description: string;
  image_url: string;
  sort_order: string;
  is_active: boolean;
  show_on_homepage: boolean;
  homepage_description: string;
  homepage_display_order: string;
  homepage_theme: string;
  homepage_button_text: string;
  homepage_banner_image_url: string;
};

const EMPTY_FORM: CategoryFormValues = {
  name: "",
  slug: "",
  description: "",
  image_url: "",
  sort_order: "0",
  is_active: true,
  show_on_homepage: false,
  homepage_description: "",
  homepage_display_order: "0",
  homepage_theme: "blush",
  homepage_button_text: "Explore Collection",
  homepage_banner_image_url: ""
};

const HOMEPAGE_THEMES = [
  { value: "blush", label: "Blush" },
  { value: "rose", label: "Rose" },
  { value: "peach", label: "Peach" },
  { value: "cream", label: "Cream" },
  { value: "gold", label: "Gold" },
  { value: "lavender", label: "Lavender" },
  { value: "lilac", label: "Lilac" },
  { value: "sky", label: "Sky" },
  { value: "mint", label: "Mint" },
  { value: "sage", label: "Sage" },
  { value: "coral", label: "Coral" },
  { value: "pearl", label: "Pearl" },
  { value: "sand", label: "Sand" },
  { value: "maroon", label: "Maroon" },
  { value: "emerald", label: "Emerald" }
] as const;

const DEFAULT_MODAL_WIDTH = 720;
const MIN_MODAL_WIDTH = 650;
const MAX_MODAL_WIDTH = 1100;

function clampModalWidth(width: number): number {
  return Math.min(MAX_MODAL_WIDTH, Math.max(MIN_MODAL_WIDTH, width));
}

type CategoryFormModalProps = {
  open: boolean;
  title: string;
  initial?: AdminCategoryRow | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: CategoryFormValues) => Promise<void>;
};

function inferFormatFromUrl(url: string): string {
  if (url.startsWith("data:image/png")) return "PNG";
  if (url.startsWith("data:image/webp")) return "WEBP";
  if (url.startsWith("data:image/")) return "JPEG";
  if (/\.png(?:\?|$)/i.test(url)) return "PNG";
  if (/\.webp(?:\?|$)/i.test(url)) return "WEBP";
  if (/\.jpe?g(?:\?|$)/i.test(url)) return "JPEG";
  return "Image";
}

function useImageDimensionsFromUrl(url: string) {
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const trimmed = url.trim();
    if (!trimmed) {
      setDimensions(null);
      return;
    }

    let cancelled = false;
    const image = new window.Image();
    image.onload = () => {
      if (!cancelled) {
        setDimensions({ width: image.naturalWidth, height: image.naturalHeight });
      }
    };
    image.onerror = () => {
      if (!cancelled) setDimensions(null);
    };
    image.src = trimmed;

    return () => {
      cancelled = true;
    };
  }, [url]);

  return dimensions;
}

function BannerImageInfoPanel({
  imageUrl,
  uploadMeta,
  onUrlChange,
  disabled
}: {
  imageUrl: string;
  uploadMeta: BannerUploadMeta | null;
  onUrlChange: (url: string) => void;
  disabled?: boolean;
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const loadedDimensions = useImageDimensionsFromUrl(imageUrl);
  const hasImage = Boolean(imageUrl.trim());

  if (!hasImage) return null;

  const format = uploadMeta?.format ?? inferFormatFromUrl(imageUrl);
  const width = uploadMeta?.width ?? loadedDimensions?.width;
  const height = uploadMeta?.height ?? loadedDimensions?.height;
  const fileSize =
    uploadMeta?.fileSizeBytes != null ? formatFileSize(uploadMeta.fileSizeBytes) : null;
  const storage = uploadMeta?.storage ?? detectStorage(imageUrl);

  return (
    <div className="rounded-lg border border-accent/20 bg-white/80 p-3">
      <p className="text-sm font-semibold text-foreground/85">Image Uploaded</p>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
        <dt className="text-foreground/50">Format</dt>
        <dd className="font-medium text-foreground/80">{format}</dd>
        <dt className="text-foreground/50">Dimensions</dt>
        <dd className="font-medium text-foreground/80">
          {width && height ? `${width} × ${height}` : "Loading…"}
        </dd>
        <dt className="text-foreground/50">File Size</dt>
        <dd className="font-medium text-foreground/80">{fileSize ?? "—"}</dd>
        <dt className="text-foreground/50">Storage</dt>
        <dd className="font-medium text-foreground/80">{storage}</dd>
      </dl>

      <button
        type="button"
        onClick={() => setAdvancedOpen((open) => !open)}
        className="mt-3 flex w-full items-center justify-between rounded-md border border-accent/20 px-3 py-2 text-left text-xs font-semibold text-foreground/70 transition hover:border-primary/25 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        aria-expanded={advancedOpen}
      >
        Advanced
        {advancedOpen ? (
          <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </button>

      {advancedOpen ? (
        <div className="mt-2">
          <label htmlFor="category-homepage-banner-url" className="mb-1 block text-xs font-semibold">
            Banner Image URL
          </label>
          <input
            id="category-homepage-banner-url"
            type="url"
            className="w-full rounded-lg border px-3 py-2 text-xs"
            value={imageUrl}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="https://..."
            tabIndex={disabled ? -1 : 0}
          />
        </div>
      ) : null}
    </div>
  );
}

export function CategoryFormModal({
  open,
  title,
  initial,
  saving,
  onClose,
  onSubmit
}: CategoryFormModalProps) {
  const [form, setForm] = useState<CategoryFormValues>(EMPTY_FORM);
  const [bannerUploadMeta, setBannerUploadMeta] = useState<BannerUploadMeta | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [modalWidth, setModalWidth] = useState(DEFAULT_MODAL_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const resizeState = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    setModalWidth(DEFAULT_MODAL_WIDTH);
    setBannerUploadMeta(null);
    if (initial) {
      setForm({
        name: initial.name,
        slug: initial.slug,
        description: initial.description ?? "",
        image_url: initial.image_url ?? "",
        sort_order: String(initial.sort_order),
        is_active: initial.is_active,
        show_on_homepage: initial.show_on_homepage ?? false,
        homepage_description: initial.homepage_description ?? "",
        homepage_display_order: String(initial.homepage_display_order ?? 0),
        homepage_theme: initial.homepage_theme ?? "blush",
        homepage_button_text: initial.homepage_button_text ?? "Explore Collection",
        homepage_banner_image_url: initial.homepage_banner_image_url ?? ""
      });
      setSlugTouched(true);
    } else {
      setForm(EMPTY_FORM);
      setSlugTouched(false);
    }
  }, [open, initial]);

  const handleResizeStart = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      resizeState.current = { startX: event.clientX, startWidth: modalWidth };
      setIsResizing(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [modalWidth]
  );

  const handleResizeMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeState.current) return;
    const delta = event.clientX - resizeState.current.startX;
    setModalWidth(clampModalWidth(resizeState.current.startWidth + delta));
  }, []);

  const handleResizeEnd = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    resizeState.current = null;
    setIsResizing(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);

  if (!open) return null;

  const handleNameChange = (name: string) => {
    setForm((f) => ({
      ...f,
      name,
      slug: !slugTouched && !initial ? slugify(name) : f.slug
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-modal-title"
        className={`relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-xl bg-white p-6 shadow-xl ${
          isResizing ? "select-none" : ""
        }`}
        style={{ width: modalWidth, maxWidth: "100%" }}
      >
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize modal"
          className="absolute inset-y-0 right-0 z-20 w-2 cursor-col-resize touch-none"
          onPointerDown={handleResizeStart}
          onPointerMove={handleResizeMove}
          onPointerUp={handleResizeEnd}
          onPointerCancel={handleResizeEnd}
        />
        <div className="mb-4 flex items-center justify-between">
          <h2 id="category-modal-title" className="font-display text-lg font-bold text-primary">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 hover:bg-blush"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="category-name" className="mb-1 block text-sm font-semibold">
              Name *
            </label>
            <input
              id="category-name"
              required
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Designer Wear Blouses"
            />
          </div>

          <div>
            <label htmlFor="category-slug" className="mb-1 block text-sm font-semibold">
              Slug *
            </label>
            <input
              id="category-slug"
              required
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                setForm((f) => ({ ...f, slug: slugify(e.target.value) }));
              }}
              placeholder="designer-wear"
            />
          </div>

          <div>
            <label htmlFor="category-description" className="mb-1 block text-sm font-semibold">
              Description
            </label>
            <textarea
              id="category-description"
              rows={3}
              maxLength={CATEGORY_DESCRIPTION_MAX_LENGTH}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Optional category description"
            />
            <p className="mt-1 text-xs text-foreground/50">
              Optional. Max {CATEGORY_DESCRIPTION_MAX_LENGTH} characters.
            </p>
          </div>

          <div>
            <label htmlFor="category-image" className="mb-1 block text-sm font-semibold">
              Image URL
            </label>
            <input
              id="category-image"
              type="url"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={form.image_url}
              onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
              placeholder="https://..."
            />
          </div>

          <div>
            <label htmlFor="category-sort" className="mb-1 block text-sm font-semibold">
              Sort order
            </label>
            <input
              id="category-sort"
              type="number"
              min={0}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={form.sort_order}
              onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            />
            Active (visible in store)
          </label>

          <div className="space-y-4 rounded-xl border border-accent/20 bg-blush/20 p-4 sm:p-5">
            <div>
              <h3 className="font-display text-base font-bold text-primary">Homepage Collection</h3>
              <p className="mt-1 text-sm text-foreground/65">
                Configure how this category appears in the Explore Our Collections section on the
                homepage.
              </p>
            </div>

            <div>
              <label
                htmlFor="category-show-on-homepage"
                className="flex cursor-pointer items-start gap-3"
              >
                <span className="relative mt-0.5 inline-flex shrink-0">
                  <input
                    id="category-show-on-homepage"
                    type="checkbox"
                    className="peer sr-only"
                    checked={form.show_on_homepage}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, show_on_homepage: e.target.checked }))
                    }
                  />
                  <span
                    className="block h-6 w-11 rounded-full bg-gray-200 transition-colors peer-checked:bg-primary peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary"
                    aria-hidden="true"
                  />
                  <span
                    className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5"
                    aria-hidden="true"
                  />
                </span>
                <span>
                  <span className="block text-sm font-semibold">Show this category on Homepage</span>
                  <span className="mt-0.5 block text-xs text-foreground/50">
                    Only enabled categories will appear inside Explore Our Collections.
                  </span>
                </span>
              </label>
            </div>

            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                form.show_on_homepage ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <div
                  className={`grid gap-4 pt-2 transition-opacity duration-300 md:grid-cols-2 ${
                    form.show_on_homepage ? "opacity-100" : "opacity-0"
                  }`}
                  aria-hidden={!form.show_on_homepage}
                >
                  <div>
                    <label
                      htmlFor="category-homepage-description"
                      className="mb-1 block text-sm font-semibold"
                    >
                      Homepage Description
                    </label>
                    <textarea
                      id="category-homepage-description"
                      rows={3}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      value={form.homepage_description}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, homepage_description: e.target.value }))
                      }
                      placeholder="Short description shown on homepage card..."
                      tabIndex={form.show_on_homepage ? 0 : -1}
                    />
                    <p className="mt-1 text-xs text-foreground/50">
                      Maximum 120 characters recommended.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="category-homepage-display-order"
                      className="mb-1 block text-sm font-semibold"
                    >
                      Homepage Display Order
                    </label>
                    <input
                      id="category-homepage-display-order"
                      type="number"
                      min={0}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      value={form.homepage_display_order}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, homepage_display_order: e.target.value }))
                      }
                      tabIndex={form.show_on_homepage ? 0 : -1}
                    />
                    <p className="mt-1 text-xs text-foreground/50">Lower numbers appear first.</p>
                  </div>

                  <div>
                    <label
                      htmlFor="category-homepage-theme"
                      className="mb-1 block text-sm font-semibold"
                    >
                      Homepage Theme
                    </label>
                    <select
                      id="category-homepage-theme"
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      value={form.homepage_theme}
                      onChange={(e) => setForm((f) => ({ ...f, homepage_theme: e.target.value }))}
                      tabIndex={form.show_on_homepage ? 0 : -1}
                    >
                      {HOMEPAGE_THEMES.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="category-homepage-button-text"
                      className="mb-1 block text-sm font-semibold"
                    >
                      Button Text
                    </label>
                    <input
                      id="category-homepage-button-text"
                      type="text"
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      value={form.homepage_button_text}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, homepage_button_text: e.target.value }))
                      }
                      placeholder="Explore Collection"
                      tabIndex={form.show_on_homepage ? 0 : -1}
                    />
                  </div>

                  <div className="space-y-3 md:col-span-2">
                    <div>
                      <p className="mb-1 text-sm font-semibold">Homepage Banner Image</p>
                      <HomepageBannerUploader
                        imageUrl={form.homepage_banner_image_url}
                        onChange={(url) => {
                          setForm((f) => ({ ...f, homepage_banner_image_url: url }));
                          if (!url.trim()) setBannerUploadMeta(null);
                        }}
                        onUploadMetaChange={setBannerUploadMeta}
                        disabled={!form.show_on_homepage}
                      />
                    </div>
                    <BannerImageInfoPanel
                      imageUrl={form.homepage_banner_image_url}
                      uploadMeta={bannerUploadMeta}
                      onUrlChange={(url) => setForm((f) => ({ ...f, homepage_banner_image_url: url }))}
                      disabled={!form.show_on_homepage}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <HomepageCollectionPreview
                      title={form.name}
                      description={form.homepage_description}
                      buttonText={form.homepage_button_text}
                      theme={form.homepage_theme}
                      bannerImageUrl={form.homepage_banner_image_url}
                      slug={form.slug}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-outline px-4 py-2 text-sm">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary px-4 py-2 text-sm disabled:opacity-60">
              {saving ? "Saving…" : "Save Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
