import { getEmailAppUrl } from "@/lib/server/notifications/email-app-url";

const MAX_EMAIL_IMAGE_URL_LENGTH = 2048;

function siteBase(): string | undefined {
  return getEmailAppUrl();
}

/** Reject data URLs, base64 blobs, and other non-http(s) image sources for email. */
export function isValidEmailImageUrl(url: string | undefined | null): url is string {
  const trimmed = url?.trim();
  if (!trimmed || trimmed.length > MAX_EMAIL_IMAGE_URL_LENGTH) return false;

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("data:") ||
    lower.startsWith("blob:") ||
    lower.startsWith("javascript:") ||
    lower.includes("base64")
  ) {
    return false;
  }

  try {
    const href = trimmed.startsWith("//") ? `https:${trimmed}` : trimmed;
    const parsed = new URL(href);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/** Force absolute https URL for email clients; returns undefined for invalid sources. */
export function toAbsoluteHttpsUrl(url: string | undefined | null): string | undefined {
  const trimmed = url?.trim();
  if (!trimmed) return undefined;

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("data:") ||
    lower.startsWith("blob:") ||
    lower.includes("base64")
  ) {
    return undefined;
  }

  let absolute: string | undefined;

  if (trimmed.startsWith("//")) {
    absolute = `https:${trimmed}`;
  } else if (trimmed.startsWith("https://")) {
    absolute = trimmed;
  } else if (trimmed.startsWith("http://")) {
    absolute = trimmed.replace(/^http:\/\//i, "https://");
  } else if (trimmed.startsWith("/")) {
    const base = siteBase();
    if (!base) return undefined;
    absolute = `${base}${trimmed}`;
  } else {
    const base = siteBase();
    if (base) {
      absolute = `${base}/${trimmed.replace(/^\//, "")}`;
    }
  }

  if (!absolute || !isValidEmailImageUrl(absolute)) return undefined;
  return absolute.replace(/^http:\/\//i, "https://");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readNestedImage(raw: unknown): string | undefined {
  const obj = asRecord(raw);
  if (!obj) return undefined;

  const product = asRecord(obj.product);
  if (!product) return undefined;

  const images = product.images;
  if (!Array.isArray(images) || !images.length) return undefined;

  const first = images[0];
  if (typeof first === "string" && first.trim()) return first.trim();

  const imgObj = asRecord(first);
  if (!imgObj) return undefined;

  for (const key of ["url", "src", "secure_url"]) {
    const v = imgObj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

/** Resolve product image for emails: normalized image, then product.images[0]. */
export function resolveEmailProductImage(
  rawItem: unknown,
  normalizedImage?: string
): string | undefined {
  return (
    toAbsoluteHttpsUrl(normalizedImage) ??
    toAbsoluteHttpsUrl(readNestedImage(rawItem)) ??
    undefined
  );
}
