"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import { CampaignHeroUploader } from "@/components/admin/campaigns/CampaignHeroUploader";
import { CampaignContentDesign, type CampaignStyleMode } from "@/components/admin/campaigns/CampaignContentDesign";
import { CatalogCategoryPicker } from "@/components/admin/targeting/CatalogCategoryPicker";
import { CatalogProductPicker } from "@/components/admin/targeting/CatalogProductPicker";
import {
  CAMPAIGN_OCCASIONS,
  isPredefinedCampaignOccasion,
  type AdminCampaignDto
} from "@/lib/admin/campaigns";
import type { CatalogTargetScope } from "@/lib/admin/catalog-targeting";
import {
  DEFAULT_CAMPAIGN_CONTENT_STYLE,
  parseCampaignContentStyle,
  type CampaignContentStyle
} from "@/lib/campaigns/campaign-hero-content-style";
import type { HomepageHeroDisplayMode } from "@/lib/campaigns/homepage-hero-campaign";
import { isSafeInternalCtaUrl } from "@/lib/campaigns/homepage-hero-campaign";

const sectionCardClass =
  "min-w-0 w-full rounded-xl border border-accent/30 bg-white p-5 shadow-card sm:p-6";

export type CampaignUpsertPayload = {
  name: string;
  occasion: string | null;
  displayMode: HomepageHeroDisplayMode;
  scope: CatalogTargetScope;
  startsAt: string;
  endsAt: string;
  isEnabled: boolean;
  heroImageUrl: string;
  mobileImageUrl: string | null;
  heading: string | null;
  subheading: string | null;
  offerText: string | null;
  ctaText: string | null;
  ctaUrl: string | null;
  contentStyle: CampaignContentStyle | null;
  productIds: string[];
  categoryIds: string[];
  priority: number;
};

type CampaignFormProps = {
  mode: "create" | "edit";
  initial?: AdminCampaignDto | null;
  saving: boolean;
  onSubmit: (payload: CampaignUpsertPayload) => Promise<void>;
};

function toDatetimeLocalValue(iso?: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function datetimeLocalToIso(value: string): string {
  return new Date(value).toISOString();
}

function asOptional(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function occasionSelectFromStored(stored: string | null | undefined): string {
  return stored?.trim() ? stored.trim() : "";
}

function extraOccasionsFromStored(stored: string | null | undefined): string[] {
  const value = stored?.trim();
  if (!value || isPredefinedCampaignOccasion(value)) return [];
  return [value];
}

function validateCampaignForm(input: {
  name: string;
  showCustomOccasion: boolean;
  customOccasionDraft: string;
  displayMode: HomepageHeroDisplayMode;
  scope: CatalogTargetScope;
  productIds: string[];
  categoryIds: string[];
  heroImageUrl: string;
  heading: string;
  ctaText: string;
  ctaUrl: string;
  startsAtLocal: string;
  endsAtLocal: string;
  priority: string;
}): string | null {
  if (!input.name.trim()) return "Name is required";
  if (!input.heroImageUrl.trim()) return "Desktop hero image is required";
  if (input.showCustomOccasion && !input.customOccasionDraft.trim()) {
    return "Enter an occasion name";
  }
  if (input.showCustomOccasion && input.customOccasionDraft.trim().toLowerCase() === "custom") {
    return "Enter the actual custom occasion name";
  }
  if (!input.startsAtLocal) return "Starts At is required";
  if (!input.endsAtLocal) return "Ends At is required";

  const startsAt = new Date(input.startsAtLocal);
  const endsAt = new Date(input.endsAtLocal);
  if (Number.isNaN(startsAt.getTime())) return "Starts At must be a valid date";
  if (Number.isNaN(endsAt.getTime())) return "Ends At must be a valid date";
  if (endsAt.getTime() <= startsAt.getTime()) return "endsAt must be later than startsAt";

  if (input.displayMode === "image_with_content" && !input.heading.trim()) {
    return "Heading is required for Image + Content campaigns";
  }

  const ctaText = input.ctaText.trim();
  const ctaUrl = input.ctaUrl.trim();
  if (Boolean(ctaText) !== Boolean(ctaUrl)) {
    return "CTA text and CTA URL must both be provided, or both left empty";
  }
  if (ctaUrl && !isSafeInternalCtaUrl(ctaUrl)) {
    return "CTA URL must be an internal path starting with /";
  }

  if (input.scope === "product") {
    if (input.productIds.length === 0) return "Select at least one product for a product campaign";
  } else if (input.scope === "category") {
    if (input.categoryIds.length === 0) return "Select at least one category for a category campaign";
  } else {
    return "Scope must be product or category";
  }

  if (input.priority.trim() !== "") {
    const priority = Number(input.priority);
    if (!Number.isInteger(priority)) return "Priority must be an integer";
  }

  return null;
}

export function CampaignForm({ mode, initial, saving, onSubmit }: CampaignFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [occasionSelect, setOccasionSelect] = useState(occasionSelectFromStored(initial?.occasion));
  const [extraOccasions, setExtraOccasions] = useState(extraOccasionsFromStored(initial?.occasion));
  const [showCustomOccasion, setShowCustomOccasion] = useState(false);
  const [customOccasionDraft, setCustomOccasionDraft] = useState("");
  const [displayMode, setDisplayMode] = useState<HomepageHeroDisplayMode>(
    initial?.displayMode ?? "image_with_content"
  );
  const [scope, setScope] = useState<CatalogTargetScope>(initial?.scope ?? "product");
  const [productIds, setProductIds] = useState<string[]>(initial?.productIds ?? []);
  const [categoryIds, setCategoryIds] = useState<string[]>(initial?.categoryIds ?? []);
  const [startsAtLocal, setStartsAtLocal] = useState(toDatetimeLocalValue(initial?.startsAt));
  const [endsAtLocal, setEndsAtLocal] = useState(toDatetimeLocalValue(initial?.endsAt));
  const [priority, setPriority] = useState(initial?.priority != null ? String(initial.priority) : "0");
  const [isEnabled, setIsEnabled] = useState(initial?.isEnabled === true);
  const [heroImageUrl, setHeroImageUrl] = useState(initial?.heroImageUrl ?? "");
  const [mobileImageUrl, setMobileImageUrl] = useState(initial?.mobileImageUrl ?? "");
  const [heading, setHeading] = useState(initial?.heading ?? "");
  const [subheading, setSubheading] = useState(initial?.subheading ?? "");
  const [offerText, setOfferText] = useState(initial?.offerText ?? "");
  const [ctaText, setCtaText] = useState(initial?.ctaText ?? "");
  const [ctaUrl, setCtaUrl] = useState(initial?.ctaUrl ?? "");
  const [styleMode, setStyleMode] = useState<CampaignStyleMode>(initial?.contentStyle ? "custom" : "auto");
  const [draftStyle, setDraftStyle] = useState<CampaignContentStyle>(
    initial?.contentStyle ?? DEFAULT_CAMPAIGN_CONTENT_STYLE
  );

  const contentEnabled = displayMode === "image_with_content";
  const occasionOptions = useMemo(() => {
    const extras = extraOccasions.filter((value) => !isPredefinedCampaignOccasion(value));
    return [...CAMPAIGN_OCCASIONS, ...extras];
  }, [extraOccasions]);

  const commitCustomOccasion = (): string | null => {
    const value = customOccasionDraft.trim();
    if (!value) {
      toast.error("Enter an occasion name");
      return null;
    }
    if (value.toLowerCase() === "custom") {
      toast.error("Enter the actual custom occasion name");
      return null;
    }

    const existing = occasionOptions.find((option) => option.toLowerCase() === value.toLowerCase());
    if (existing) {
      setOccasionSelect(existing);
      setShowCustomOccasion(false);
      setCustomOccasionDraft("");
      return existing;
    }

    setExtraOccasions((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setOccasionSelect(value);
    setShowCustomOccasion(false);
    setCustomOccasionDraft("");
    return value;
  };

  const handleScopeChange = (next: CatalogTargetScope) => {
    setScope(next);
    if (next === "product") {
      setCategoryIds([]);
    } else {
      setProductIds([]);
    }
  };

  const handleOccasionSelectChange = (value: string) => {
    setOccasionSelect(value);
    setShowCustomOccasion(false);
    setCustomOccasionDraft("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const error = validateCampaignForm({
      name,
      showCustomOccasion,
      customOccasionDraft,
      displayMode,
      scope,
      productIds,
      categoryIds,
      heroImageUrl,
      heading,
      ctaText,
      ctaUrl,
      startsAtLocal,
      endsAtLocal,
      priority
    });
    if (error) {
      toast.error(error);
      return;
    }

    let occasion = asOptional(occasionSelect);
    if (showCustomOccasion) {
      const committed = commitCustomOccasion();
      if (!committed) return;
      occasion = committed;
    }

    const contentStyle = styleMode === "custom" ? parseCampaignContentStyle(draftStyle) : null;
    if (styleMode === "custom" && !contentStyle) {
      toast.error("Content Design has invalid values. Check custom fonts, sizes, and colors.");
      return;
    }

    const payload: CampaignUpsertPayload = {
      name: name.trim(),
      occasion,
      displayMode,
      scope,
      startsAt: datetimeLocalToIso(startsAtLocal),
      endsAt: datetimeLocalToIso(endsAtLocal),
      isEnabled,
      heroImageUrl: heroImageUrl.trim(),
      mobileImageUrl: asOptional(mobileImageUrl),
      heading: asOptional(heading),
      subheading: asOptional(subheading),
      offerText: asOptional(offerText),
      ctaText: asOptional(ctaText),
      ctaUrl: asOptional(ctaUrl),
      contentStyle,
      productIds: scope === "product" ? productIds : [],
      categoryIds: scope === "category" ? categoryIds : [],
      priority: priority.trim() === "" ? 0 : Number(priority)
    };

    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <section className={sectionCardClass}>
        <h2 className="font-display text-lg font-bold text-primary">Basic information</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            Campaign name
            <input
              required
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <div className="text-sm sm:col-span-2">
            <p className="mb-1">Occasion</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                className="min-w-0 w-full rounded-lg border px-3 py-2 sm:flex-1"
                value={occasionSelect}
                onChange={(e) => handleOccasionSelectChange(e.target.value)}
              >
                <option value="">None</option>
                {occasionOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowCustomOccasion(true)}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border-2 border-primary/25 bg-white px-5 py-2.5 text-sm font-semibold text-primary transition-all duration-150 hover:border-primary hover:bg-[#fff5f7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2"
              >
                <Plus className="h-4 w-4" />
                Custom
              </button>
            </div>
            {showCustomOccasion ? (
              <div className="mt-3 flex max-w-md flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  type="text"
                  autoFocus
                  className="w-full rounded-lg border px-3 py-2 sm:flex-1"
                  placeholder="Custom occasion name"
                  value={customOccasionDraft}
                  onChange={(e) => setCustomOccasionDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitCustomOccasion();
                    }
                    if (e.key === "Escape") {
                      setShowCustomOccasion(false);
                      setCustomOccasionDraft("");
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => commitCustomOccasion()}
                  className="btn-primary shrink-0 px-5 py-2.5 text-sm"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomOccasion(false);
                    setCustomOccasionDraft("");
                  }}
                  className="text-sm font-medium text-foreground/55 transition-colors duration-150 hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            ) : null}
          </div>
          <fieldset className="text-sm">
            <legend>Display mode</legend>
            <div className="mt-2 space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="displayMode"
                  checked={displayMode === "image_with_content"}
                  onChange={() => setDisplayMode("image_with_content")}
                />
                Image + Content
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="displayMode"
                  checked={displayMode === "image_only"}
                  onChange={() => setDisplayMode("image_only")}
                />
                Image Only
              </label>
            </div>
          </fieldset>
        </div>
      </section>

      <section className={sectionCardClass}>
        <h2 className="font-display text-lg font-bold text-primary">Targeting</h2>
        <p className="mt-1 text-sm text-foreground/65">
          Choose the products or categories this campaign is intended to promote. This does not apply
          discounts or change the CTA URL.
        </p>
        <div className="mt-4 space-y-4">
          <div>
            <p className="mb-2 text-sm font-semibold">Scope *</p>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="campaign-scope"
                  value="product"
                  checked={scope === "product"}
                  onChange={() => handleScopeChange("product")}
                  disabled={saving}
                />
                Product
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="campaign-scope"
                  value="category"
                  checked={scope === "category"}
                  onChange={() => handleScopeChange("category")}
                  disabled={saving}
                />
                Category
              </label>
            </div>
          </div>
          {scope === "product" ? (
            <CatalogProductPicker selectedIds={productIds} onChange={setProductIds} disabled={saving} />
          ) : (
            <CatalogCategoryPicker
              selectedIds={categoryIds}
              onChange={setCategoryIds}
              disabled={saving}
            />
          )}
        </div>
      </section>

      <section className={sectionCardClass}>
        <h2 className="font-display text-lg font-bold text-primary">Campaign images</h2>
        <p className="mt-1 text-sm text-foreground/65">
          Images upload to Cloudinary folder <code>fashionpoint/campaigns</code>. They never overwrite the
          default homepage hero assets.
        </p>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium">Desktop hero image</p>
            <CampaignHeroUploader
              imageUrl={heroImageUrl}
              onChange={setHeroImageUrl}
              emptyStateTitle="Desktop campaign hero"
              recommendedSize="1920 × 800"
              aspectHint="Wide full-width crop. Shown on md+ screens, object-cover."
              previewAlt="Desktop campaign hero"
              previewAspectClass="aspect-[12/5]"
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Mobile hero image (optional)</p>
            <CampaignHeroUploader
              imageUrl={mobileImageUrl}
              onChange={setMobileImageUrl}
              emptyStateTitle="Mobile campaign hero"
              recommendedSize="1080 × 1350"
              aspectHint="Taller phone crop. Shown below the md breakpoint."
              previewAlt="Mobile campaign hero"
              previewAspectClass="aspect-[4/5]"
            />
          </div>
        </div>
      </section>

      <section className={`${sectionCardClass} ${contentEnabled ? "" : "opacity-70"}`}>
        <h2 className="font-display text-lg font-bold text-primary">Content</h2>
        {!contentEnabled ? (
          <p className="mt-1 text-sm text-foreground/60">
            Hidden for Image Only. Existing values are kept and not required.
          </p>
        ) : null}
        <div className="mt-4 grid gap-4">
          <label className="block text-sm">
            Heading {contentEnabled ? <span className="text-primary">*</span> : null}
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={heading}
              disabled={!contentEnabled}
              onChange={(e) => setHeading(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Subheading
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={subheading}
              disabled={!contentEnabled}
              onChange={(e) => setSubheading(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Offer text
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={offerText}
              disabled={!contentEnabled}
              onChange={(e) => setOfferText(e.target.value)}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              CTA text
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={ctaText}
                disabled={!contentEnabled}
                onChange={(e) => setCtaText(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              CTA URL
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2"
                placeholder="/products"
                value={ctaUrl}
                disabled={!contentEnabled}
                onChange={(e) => setCtaUrl(e.target.value)}
              />
            </label>
          </div>
          <p className="text-xs text-foreground/50">
            CTA is optional. If used, both text and an internal path are required. Examples: /products,
            /category/party-wear, /#explore-our-collections
          </p>
        </div>
      </section>

      <CampaignContentDesign
        visible={contentEnabled}
        heroImageUrl={heroImageUrl}
        heading={heading}
        subheading={subheading}
        offerText={offerText}
        ctaText={ctaText}
        styleMode={styleMode}
        draftStyle={draftStyle}
        onStyleModeChange={setStyleMode}
        onDraftStyleChange={setDraftStyle}
      />

      <section className={sectionCardClass}>
        <h2 className="font-display text-lg font-bold text-primary">Schedule and activation</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            Starts at
            <input
              type="datetime-local"
              required
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={startsAtLocal}
              onChange={(e) => setStartsAtLocal(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Ends at
            <input
              type="datetime-local"
              required
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={endsAtLocal}
              onChange={(e) => setEndsAtLocal(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Priority
            <input
              type="number"
              step="1"
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            />
          </label>
          <label className="mt-7 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
            />
            Enable campaign
          </label>
        </div>
        <p className="mt-3 text-xs text-foreground/50">
          Dates use this browser’s local timezone, then save as UTC — the same pattern as Festival Offers.
          If more than one campaign is valid, the homepage shows the highest priority, then latest start.
        </p>
      </section>

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
          {saving ? "Saving…" : mode === "create" ? "Create campaign" : "Save campaign"}
        </button>
        <Link href="/admin/campaigns" className="btn-outline px-4 py-2 text-sm">
          Cancel
        </Link>
      </div>
    </form>
  );
}
