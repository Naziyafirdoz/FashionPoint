"use client";

import { Store } from "lucide-react";
import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { isValidEmail, isValidIndianMobile, normalizeIndianMobile } from "@/lib/checkout/contact-validation";
import {
  DEFAULT_STORE_INFORMATION,
  isAllowedLogoUrl,
  parseStoredStoreInformation,
  resolveSeoTitle,
  type StoreInformation
} from "@/lib/settings/store-information";
import { SettingsField, SettingsFieldList, SettingsSection } from "./settings-shared";

type StoreInformationForm = StoreInformation;

type AdminStoreInformationProps = {
  initialStoreInformation: StoreInformation;
};

function formatPhoneDisplay(phone: string): string {
  const digits = normalizeIndianMobile(phone);
  if (digits.length !== 10) return phone.trim();
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

function mapSettings(raw: unknown): StoreInformationForm | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (
    typeof row.storeName !== "string" ||
    typeof row.address !== "string" ||
    typeof row.primaryPhone !== "string" ||
    typeof row.supportEmail !== "string"
  ) {
    return null;
  }
  return parseStoredStoreInformation(raw);
}

function validateForm(form: StoreInformationForm): string | null {
  if (!form.storeName.trim()) return "Store name is required";
  if (!form.address.trim()) return "Address is required";
  if (!isValidIndianMobile(form.primaryPhone)) {
    return "Primary phone must be a valid 10-digit Indian mobile number";
  }
  if (!isValidEmail(form.supportEmail.trim())) return "Enter a valid support email";
  if (form.tagline.trim().length > 80) return "Tagline must be 80 characters or fewer";
  if (form.description.trim().length > 300) return "Store description must be 300 characters or fewer";
  if (!isAllowedLogoUrl(form.logoUrl.trim())) {
    return "Logo URL must be a http(s) link or a site path starting with /";
  }
  if (form.seoTitle.trim().length > 80) return "SEO title must be 80 characters or fewer";
  if (form.seoDescription.trim().length > 220) return "SEO description must be 220 characters or fewer";
  return null;
}

const inputClassName = "mt-1 w-full rounded-lg border px-3 py-2 text-sm";

export function AdminStoreInformation({ initialStoreInformation }: AdminStoreInformationProps) {
  const [saved, setSaved] = useState<StoreInformationForm>(initialStoreInformation);
  const [form, setForm] = useState<StoreInformationForm>(initialStoreInformation);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const applySettings = useCallback((next: StoreInformationForm) => {
    setSaved(next);
    setForm(next);
  }, []);

  const startEdit = () => {
    setForm(saved);
    setEditing(true);
  };

  const cancelEdit = () => {
    setForm(saved);
    setEditing(false);
  };

  const save = async () => {
    const error = validateForm(form);
    if (error) {
      toast.error(error);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/store-information", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName: form.storeName.trim(),
          address: form.address.trim(),
          primaryPhone: form.primaryPhone,
          supportEmail: form.supportEmail.trim(),
          tagline: form.tagline.trim(),
          description: form.description.trim(),
          logoUrl: form.logoUrl.trim(),
          seoTitle: form.seoTitle.trim(),
          seoDescription: form.seoDescription.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to save store information");
        return;
      }
      const mapped = mapSettings(data.settings);
      if (mapped) applySettings(mapped);
      setEditing(false);
      toast.success("Store information saved");
    } catch {
      toast.error("Failed to save store information");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSection title="Store Information" icon={Store}>
      {editing ? (
        <div className="space-y-3 text-sm">
          <div>
            <label htmlFor="store-info-name" className="text-foreground/60">
              Store name
            </label>
            <input
              id="store-info-name"
              className={inputClassName}
              value={form.storeName}
              onChange={(e) => setForm((current) => ({ ...current, storeName: e.target.value }))}
              disabled={saving}
            />
          </div>
          <div>
            <label htmlFor="store-info-address" className="text-foreground/60">
              Address
            </label>
            <textarea
              id="store-info-address"
              rows={3}
              className={inputClassName}
              value={form.address}
              onChange={(e) => setForm((current) => ({ ...current, address: e.target.value }))}
              disabled={saving}
            />
          </div>
          <div>
            <label htmlFor="store-info-phone" className="text-foreground/60">
              Primary phone
            </label>
            <input
              id="store-info-phone"
              className={inputClassName}
              value={form.primaryPhone}
              onChange={(e) => setForm((current) => ({ ...current, primaryPhone: e.target.value }))}
              disabled={saving}
              inputMode="tel"
              autoComplete="tel"
            />
          </div>
          <div>
            <label htmlFor="store-info-email" className="text-foreground/60">
              Support email
            </label>
            <input
              id="store-info-email"
              type="email"
              className={inputClassName}
              value={form.supportEmail}
              onChange={(e) => setForm((current) => ({ ...current, supportEmail: e.target.value }))}
              disabled={saving}
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="store-info-tagline" className="text-foreground/60">
              Tagline
            </label>
            <input
              id="store-info-tagline"
              className={inputClassName}
              value={form.tagline}
              onChange={(e) => setForm((current) => ({ ...current, tagline: e.target.value }))}
              disabled={saving}
              maxLength={80}
              placeholder={DEFAULT_STORE_INFORMATION.tagline}
            />
          </div>
          <div>
            <label htmlFor="store-info-description" className="text-foreground/60">
              Store description
            </label>
            <textarea
              id="store-info-description"
              rows={3}
              className={inputClassName}
              value={form.description}
              onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
              disabled={saving}
              maxLength={300}
              placeholder={DEFAULT_STORE_INFORMATION.description}
            />
          </div>
          <div>
            <label htmlFor="store-info-logo" className="text-foreground/60">
              Logo URL
            </label>
            <input
              id="store-info-logo"
              className={inputClassName}
              value={form.logoUrl}
              onChange={(e) => setForm((current) => ({ ...current, logoUrl: e.target.value }))}
              disabled={saving}
              placeholder="Leave blank to keep the Fashion Point logo"
            />
            <p className="mt-1 text-xs text-foreground/50">
              Optional image URL or site path. Leave blank to use the current Fashion Point logo.
            </p>
          </div>
          <div>
            <label htmlFor="store-info-seo-title" className="text-foreground/60">
              SEO title
            </label>
            <input
              id="store-info-seo-title"
              className={inputClassName}
              value={form.seoTitle}
              onChange={(e) => setForm((current) => ({ ...current, seoTitle: e.target.value }))}
              disabled={saving}
              maxLength={80}
              placeholder={resolveSeoTitle({ storeName: form.storeName.trim() || DEFAULT_STORE_INFORMATION.storeName, seoTitle: "" })}
            />
            <p className="mt-1 text-xs text-foreground/50">
              Leave blank to use the store name with the Fashion Point title suffix.
            </p>
          </div>
          <div>
            <label htmlFor="store-info-seo-description" className="text-foreground/60">
              SEO description
            </label>
            <textarea
              id="store-info-seo-description"
              rows={3}
              className={inputClassName}
              value={form.seoDescription}
              onChange={(e) => setForm((current) => ({ ...current, seoDescription: e.target.value }))}
              disabled={saving}
              maxLength={220}
              placeholder={DEFAULT_STORE_INFORMATION.seoDescription}
            />
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" className="btn-outline px-4 py-2 text-sm" onClick={cancelEdit} disabled={saving}>
              Cancel
            </button>
            <button type="button" className="btn-primary px-4 py-2 text-sm disabled:opacity-60" onClick={() => void save()} disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <SettingsFieldList>
            <SettingsField label="Store name" value={saved.storeName} />
            <SettingsField label="Tagline" value={saved.tagline} />
            <SettingsField label="Store description" value={saved.description} />
            <SettingsField label="Logo URL" value={saved.logoUrl || "Fashion Point default logo"} />
            <SettingsField label="SEO title" value={resolveSeoTitle(saved)} />
            <SettingsField label="SEO description" value={saved.seoDescription} />
            <SettingsField label="Address" value={saved.address} />
            <SettingsField label="Primary phone" value={formatPhoneDisplay(saved.primaryPhone)} />
            <SettingsField label="Support email" value={saved.supportEmail} />
          </SettingsFieldList>
          <div className="mt-4">
            <button type="button" className="btn-primary px-4 py-2 text-sm disabled:opacity-60" onClick={startEdit}>
              Edit
            </button>
          </div>
        </>
      )}
    </SettingsSection>
  );
}
