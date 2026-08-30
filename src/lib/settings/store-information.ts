import { unstable_cache } from "next/cache";
import { isValidEmail, isValidIndianMobile, normalizeIndianMobile } from "@/lib/checkout/contact-validation";
import { createServiceClient } from "@/lib/supabase";
import {
  DEFAULT_STORE_BRANDING,
  parseBrandingInput,
  parseStoredBranding,
  type StoreBranding
} from "@/lib/settings/store-branding";
import {
  STORE_ADDRESS,
  STORE_DESCRIPTION,
  STORE_NAME,
  STORE_PHONE_PRIMARY,
  STORE_SEO_DESCRIPTION,
  STORE_TAGLINE,
  SUPPORT_EMAIL,
  formatDefaultSeoTitle
} from "@/lib/site-config";

export const STORE_INFORMATION_KEY = "store_information";
export const STORE_INFORMATION_CACHE_TAG = "store-information";

export type StoreInformation = {
  storeName: string;
  address: string;
  primaryPhone: string;
  supportEmail: string;
  tagline: string;
  description: string;
  logoUrl: string;
  seoTitle: string;
  seoDescription: string;
  branding: StoreBranding;
};

export const DEFAULT_STORE_INFORMATION: StoreInformation = {
  storeName: STORE_NAME,
  address: STORE_ADDRESS,
  primaryPhone: STORE_PHONE_PRIMARY,
  supportEmail: SUPPORT_EMAIL,
  tagline: STORE_TAGLINE,
  description: STORE_DESCRIPTION,
  logoUrl: "",
  seoTitle: "",
  seoDescription: STORE_SEO_DESCRIPTION,
  branding: { ...DEFAULT_STORE_BRANDING }
};

export function formatStorePhoneDisplay(phone: string): string {
  const digits = normalizeIndianMobile(phone);
  if (digits.length !== 10) return phone.trim();
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

export function formatStoreTelUrl(phone: string): string {
  return `tel:+91${normalizeIndianMobile(phone)}`;
}

export function formatStoreWhatsAppUrl(phone: string): string {
  return `https://wa.me/91${normalizeIndianMobile(phone)}`;
}

export function formatStoreCopyrightNotice(storeName: string): string {
  return `© 2026 ${storeName}. All Rights Reserved.`;
}

export type PublicStoreInformation = StoreInformation & {
  phoneDisplay: string;
  telUrl: string;
  mailtoUrl: string;
  whatsappUrl: string;
  copyrightNotice: string;
};

export function toPublicStoreInformation(info: StoreInformation): PublicStoreInformation {
  return {
    ...info,
    branding: parseStoredBranding(info.branding),
    phoneDisplay: formatStorePhoneDisplay(info.primaryPhone),
    telUrl: formatStoreTelUrl(info.primaryPhone),
    mailtoUrl: `mailto:${info.supportEmail}`,
    whatsappUrl: formatStoreWhatsAppUrl(info.primaryPhone),
    copyrightNotice: formatStoreCopyrightNotice(info.storeName)
  };
}

export function resolveSeoTitle(info: Pick<StoreInformation, "storeName" | "seoTitle">): string {
  return info.seoTitle.trim() || formatDefaultSeoTitle(info.storeName);
}

export function isAllowedLogoUrl(value: string): boolean {
  if (!value) return true;
  if (value.length > 500) return false;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value.trim();
}

function parseStoredField(
  value: unknown,
  fallback: string,
  validate: (trimmed: string) => boolean,
  normalize: (trimmed: string) => string = (trimmed) => trimmed
): string {
  const trimmed = asTrimmedString(value);
  if (!trimmed) return fallback;
  const next = normalize(trimmed);
  return validate(next) ? next : fallback;
}

export function parseStoredStoreInformation(value: unknown): StoreInformation {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...DEFAULT_STORE_INFORMATION };
  }

  const row = value as Record<string, unknown>;
  return {
    storeName: parseStoredField(row.storeName, DEFAULT_STORE_INFORMATION.storeName, (v) => v.length > 0),
    address: parseStoredField(row.address, DEFAULT_STORE_INFORMATION.address, (v) => v.length > 0),
    primaryPhone: parseStoredField(
      row.primaryPhone,
      DEFAULT_STORE_INFORMATION.primaryPhone,
      isValidIndianMobile,
      normalizeIndianMobile
    ),
    supportEmail: parseStoredField(
      row.supportEmail,
      DEFAULT_STORE_INFORMATION.supportEmail,
      isValidEmail,
      (v) => v.toLowerCase()
    ),
    tagline: parseStoredField(row.tagline, DEFAULT_STORE_INFORMATION.tagline, (v) => v.length > 0 && v.length <= 80),
    description: parseStoredField(
      row.description,
      DEFAULT_STORE_INFORMATION.description,
      (v) => v.length > 0 && v.length <= 300
    ),
    logoUrl: parseStoredField(row.logoUrl, "", isAllowedLogoUrl),
    seoTitle: parseStoredField(row.seoTitle, "", (v) => v.length <= 80),
    seoDescription: parseStoredField(
      row.seoDescription,
      DEFAULT_STORE_INFORMATION.seoDescription,
      (v) => v.length > 0 && v.length <= 220
    ),
    branding: parseStoredBranding(row.branding)
  };
}

export function parseStoreInformationInput(
  body: unknown
): { ok: true; input: StoreInformation; brandingSpecified: boolean } | { ok: false; error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Invalid store information payload" };
  }

  const row = body as Record<string, unknown>;

  const storeName = asTrimmedString(row.storeName);
  if (!storeName) {
    return { ok: false, error: "Store name is required" };
  }

  const address = asTrimmedString(row.address);
  if (!address) {
    return { ok: false, error: "Address is required" };
  }

  if (row.primaryPhone == null || row.primaryPhone === "") {
    return { ok: false, error: "Primary phone is required" };
  }
  if (typeof row.primaryPhone !== "string") {
    return { ok: false, error: "Primary phone must be a string" };
  }
  const primaryPhone = normalizeIndianMobile(row.primaryPhone);
  if (!isValidIndianMobile(primaryPhone)) {
    return {
      ok: false,
      error: "Primary phone must be a valid 10-digit Indian mobile number"
    };
  }

  const supportEmailRaw = asTrimmedString(row.supportEmail);
  if (!supportEmailRaw) {
    return { ok: false, error: "Support email is required" };
  }
  const supportEmail = supportEmailRaw.toLowerCase();
  if (!isValidEmail(supportEmail)) {
    return { ok: false, error: "Enter a valid support email" };
  }

  const tagline = parseOptionalTextField(row.tagline, DEFAULT_STORE_INFORMATION.tagline, 80, "Tagline");
  if (!tagline.ok) return tagline;

  const description = parseOptionalTextField(
    row.description,
    DEFAULT_STORE_INFORMATION.description,
    300,
    "Store description"
  );
  if (!description.ok) return description;

  const logoUrlRaw = row.logoUrl == null ? "" : asTrimmedString(row.logoUrl);
  if (row.logoUrl != null && typeof row.logoUrl !== "string") {
    return { ok: false, error: "Logo URL must be a string" };
  }
  const logoUrl = logoUrlRaw ?? "";
  if (!isAllowedLogoUrl(logoUrl)) {
    return { ok: false, error: "Logo URL must be a http(s) link or a site path starting with /" };
  }

  const seoTitle = parseOptionalTextField(row.seoTitle, "", 80, "SEO title");
  if (!seoTitle.ok) return seoTitle;

  const seoDescription = parseOptionalTextField(
    row.seoDescription,
    DEFAULT_STORE_INFORMATION.seoDescription,
    220,
    "SEO description"
  );
  if (!seoDescription.ok) return seoDescription;

  const brandingSpecified = Object.prototype.hasOwnProperty.call(row, "branding");
  const branding = brandingSpecified
    ? parseBrandingInput(row.branding)
    : { ok: true as const, branding: { ...DEFAULT_STORE_BRANDING } };
  if (!branding.ok) return branding;

  return {
    ok: true,
    brandingSpecified,
    input: {
      storeName,
      address,
      primaryPhone,
      supportEmail,
      tagline: tagline.value,
      description: description.value,
      logoUrl,
      seoTitle: seoTitle.value,
      seoDescription: seoDescription.value,
      branding: branding.branding
    }
  };
}

function parseOptionalTextField(
  value: unknown,
  fallback: string,
  maxLength: number,
  label: string
): { ok: true; value: string } | { ok: false; error: string } {
  if (value == null) {
    return { ok: true, value: fallback };
  }
  if (typeof value !== "string") {
    return { ok: false, error: `${label} must be a string` };
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    return { ok: false, error: `${label} must be ${maxLength} characters or fewer` };
  }
  return { ok: true, value: trimmed || fallback };
}

export function storeInformationWriteValue(input: StoreInformation): StoreInformation {
  return {
    storeName: input.storeName,
    address: input.address,
    primaryPhone: input.primaryPhone,
    supportEmail: input.supportEmail,
    tagline: input.tagline,
    description: input.description,
    logoUrl: input.logoUrl,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    branding: { ...input.branding }
  };
}

export async function fetchStoreInformation(): Promise<StoreInformation> {
  try {
    const db = createServiceClient();
    if (!db) return { ...DEFAULT_STORE_INFORMATION };

    const { data, error } = await db
      .from("store_settings")
      .select("value")
      .eq("key", STORE_INFORMATION_KEY)
      .maybeSingle();

    if (error || !data?.value) {
      return { ...DEFAULT_STORE_INFORMATION };
    }

    return parseStoredStoreInformation(data.value);
  } catch {
    return { ...DEFAULT_STORE_INFORMATION };
  }
}

export const getStoreInformation = unstable_cache(fetchStoreInformation, ["store-information"], {
  tags: [STORE_INFORMATION_CACHE_TAG]
});

export async function getPublicStoreInformation(): Promise<PublicStoreInformation> {
  return toPublicStoreInformation(await getStoreInformation());
}
