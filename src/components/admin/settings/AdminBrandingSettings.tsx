"use client";

import { Palette } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { BrandingPreview } from "./BrandingPreview";
import { SettingsSection } from "./settings-shared";
import {
  DEFAULT_STORE_BRANDING,
  STORE_BRAND_ALIGNS,
  STORE_FONT_FAMILIES,
  STORE_FONT_LABELS,
  isValidHexColor,
  normalizeHexColor,
  parseStoredBranding,
  type StoreBranding
} from "@/lib/settings/store-branding";
import type { StoreInformation } from "@/lib/settings/store-information";

type AdminBrandingSettingsProps = {
  initialStoreInformation: StoreInformation;
};

function validateBranding(branding: StoreBranding): string | null {
  if (!isValidHexColor(branding.primaryColor)) return "Primary color must be a valid hex color such as #7B0D2B";
  if (!isValidHexColor(branding.secondaryColor)) return "Secondary color must be a valid hex color such as #B8860B";
  if (!isValidHexColor(branding.headingColor)) return "Heading color must be a valid hex color such as #7B0D2B";
  if (!isValidHexColor(branding.bodyTextColor)) return "Body text color must be a valid hex color such as #1A1A1A";
  return null;
}

const inputClassName = "mt-1 w-full rounded-lg border px-3 py-2 text-sm";

function ColorField({
  id,
  label,
  value,
  disabled,
  onChange
}: {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-foreground/60">
        {label}
      </label>
      <div className="mt-1 flex items-center gap-2">
        <input
          id={`${id}-swatch`}
          type="color"
          className="h-10 w-12 cursor-pointer rounded border bg-white p-1"
          value={normalizeHexColor(value) ?? "#000000"}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          disabled={disabled}
        />
        <input
          id={id}
          className={inputClassName + " mt-0"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          spellCheck={false}
        />
      </div>
    </div>
  );
}

export function AdminBrandingSettings({ initialStoreInformation }: AdminBrandingSettingsProps) {
  const [saved, setSaved] = useState<StoreBranding>(initialStoreInformation.branding);
  const [form, setForm] = useState<StoreBranding>(initialStoreInformation.branding);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setForm(saved);
    setEditing(true);
  };

  const cancelEdit = () => {
    setForm(saved);
    setEditing(false);
  };

  const resetDefaults = () => {
    setForm({ ...DEFAULT_STORE_BRANDING });
  };

  const save = async () => {
    const error = validateBranding(form);
    if (error) {
      toast.error(error);
      return;
    }

    setSaving(true);
    try {
      const latestRes = await fetch("/api/admin/store-information");
      const latestData = await latestRes.json();
      if (!latestRes.ok) {
        toast.error(latestData.error ?? "Failed to load current store information");
        return;
      }

      const latest = latestData.settings as StoreInformation | undefined;
      if (!latest?.storeName) {
        toast.error("Failed to load current store information");
        return;
      }

      const res = await fetch("/api/admin/store-information", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName: latest.storeName,
          address: latest.address,
          primaryPhone: latest.primaryPhone,
          supportEmail: latest.supportEmail,
          tagline: latest.tagline,
          description: latest.description,
          logoUrl: latest.logoUrl,
          seoTitle: latest.seoTitle,
          seoDescription: latest.seoDescription,
          branding: form
        })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to save branding");
        return;
      }
      const next = parseStoredBranding(data.settings?.branding);
      setSaved(next);
      setForm(next);
      setEditing(false);
      toast.success("Branding saved");
    } catch {
      toast.error("Failed to save branding");
    } finally {
      setSaving(false);
    }
  };

  const previewBranding = editing ? form : saved;

  return (
    <SettingsSection title="Branding" icon={Palette}>
      <p className="mb-4 text-sm text-foreground/60">
        Display font and colors apply to the live storefront after you save. Use the preview below
        to review branding before publishing.
      </p>
      <BrandingPreview
        storeName={initialStoreInformation.storeName}
        tagline={initialStoreInformation.tagline}
        logoUrl={initialStoreInformation.logoUrl}
        branding={previewBranding}
      />
      {editing ? (
        <div className="mt-5 space-y-3 text-sm">
          <div>
            <label htmlFor="branding-font" className="text-foreground/60">
              Display font
            </label>
            <select
              id="branding-font"
              className={inputClassName}
              value={form.fontFamily}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  fontFamily: e.target.value as StoreBranding["fontFamily"]
                }))
              }
              disabled={saving}
            >
              {STORE_FONT_FAMILIES.map((font) => (
                <option key={font} value={font}>
                  {STORE_FONT_LABELS[font]}
                </option>
              ))}
            </select>
          </div>
          <ColorField
            id="branding-primary"
            label="Primary color"
            value={form.primaryColor}
            disabled={saving}
            onChange={(primaryColor) => setForm((current) => ({ ...current, primaryColor }))}
          />
          <ColorField
            id="branding-secondary"
            label="Secondary color"
            value={form.secondaryColor}
            disabled={saving}
            onChange={(secondaryColor) => setForm((current) => ({ ...current, secondaryColor }))}
          />
          <ColorField
            id="branding-heading"
            label="Heading color"
            value={form.headingColor}
            disabled={saving}
            onChange={(headingColor) => setForm((current) => ({ ...current, headingColor }))}
          />
          <ColorField
            id="branding-body"
            label="Body text color"
            value={form.bodyTextColor}
            disabled={saving}
            onChange={(bodyTextColor) => setForm((current) => ({ ...current, bodyTextColor }))}
          />
          <div>
            <p className="text-foreground/60">Brand alignment</p>
            <div className="mt-2 flex gap-2">
              {STORE_BRAND_ALIGNS.map((align) => (
                <button
                  key={align}
                  type="button"
                  className={`rounded-lg border px-3 py-1.5 text-sm capitalize ${
                    form.brandAlign === align
                      ? "border-primary bg-primary text-white"
                      : "border-accent/20 bg-white text-foreground/70"
                  }`}
                  onClick={() => setForm((current) => ({ ...current, brandAlign: align }))}
                  disabled={saving}
                >
                  {align}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" className="btn-outline px-4 py-2 text-sm" onClick={cancelEdit} disabled={saving}>
              Cancel
            </button>
            <button type="button" className="btn-outline px-4 py-2 text-sm" onClick={resetDefaults} disabled={saving}>
              Use default branding
            </button>
            <button
              type="button"
              className="btn-primary px-4 py-2 text-sm disabled:opacity-60"
              onClick={() => void save()}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <button type="button" className="btn-primary px-4 py-2 text-sm" onClick={startEdit}>
            Edit
          </button>
        </div>
      )}
    </SettingsSection>
  );
}
