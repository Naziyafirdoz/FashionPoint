import { unstable_cache } from "next/cache";
import { isValidEmail, isValidIndianMobile, normalizeIndianMobile } from "@/lib/checkout/contact-validation";
import { createServiceClient } from "@/lib/supabase";
import {
  STORE_ADDRESS,
  STORE_NAME,
  STORE_PHONE_PRIMARY,
  SUPPORT_EMAIL
} from "@/lib/site-config";

export const STORE_INFORMATION_KEY = "store_information";
export const STORE_INFORMATION_CACHE_TAG = "store-information";

export type StoreInformation = {
  storeName: string;
  address: string;
  primaryPhone: string;
  supportEmail: string;
};

export const DEFAULT_STORE_INFORMATION: StoreInformation = {
  storeName: STORE_NAME,
  address: STORE_ADDRESS,
  primaryPhone: STORE_PHONE_PRIMARY,
  supportEmail: SUPPORT_EMAIL
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
    storeName: info.storeName,
    address: info.address,
    primaryPhone: info.primaryPhone,
    supportEmail: info.supportEmail,
    phoneDisplay: formatStorePhoneDisplay(info.primaryPhone),
    telUrl: formatStoreTelUrl(info.primaryPhone),
    mailtoUrl: `mailto:${info.supportEmail}`,
    whatsappUrl: formatStoreWhatsAppUrl(info.primaryPhone),
    copyrightNotice: formatStoreCopyrightNotice(info.storeName)
  };
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
    )
  };
}

export function parseStoreInformationInput(
  body: unknown
): { ok: true; input: StoreInformation } | { ok: false; error: string } {
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

  return {
    ok: true,
    input: {
      storeName,
      address,
      primaryPhone,
      supportEmail
    }
  };
}

export function storeInformationWriteValue(input: StoreInformation): StoreInformation {
  return {
    storeName: input.storeName,
    address: input.address,
    primaryPhone: input.primaryPhone,
    supportEmail: input.supportEmail
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
