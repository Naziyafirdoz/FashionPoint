import { toAbsoluteHttpsUrl } from "@/lib/server/notifications/email-image";

const EMAIL_THUMB_WIDTH = 120;
const EMAIL_THUMB_HEIGHT = 150;

function isCloudinaryHttpsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname === "res.cloudinary.com";
  } catch {
    return false;
  }
}

/** Hosted product placeholder — always HTTPS Cloudinary. */
export function getAdminEmailProductPlaceholderUrl(): string {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  if (cloud) {
    return `https://res.cloudinary.com/${cloud}/image/upload/w_${EMAIL_THUMB_WIDTH},h_${EMAIL_THUMB_HEIGHT},c_fill,q_auto,f_auto/fashion-point/email/product-placeholder`;
  }
  return `https://res.cloudinary.com/demo/image/upload/w_${EMAIL_THUMB_WIDTH},h_${EMAIL_THUMB_HEIGHT},c_fill,q_auto,f_auto/sample.jpg`;
}

/** Apply fixed crop so Gmail/Outlook render a consistent 120×150 thumb. */
export function toCloudinaryEmailThumb(url: string): string {
  if (!isCloudinaryHttpsUrl(url)) return url;
  if (/\/upload\/[^/]*w_\d+/.test(url)) return url;
  return url.replace(
    "/upload/",
    `/upload/w_${EMAIL_THUMB_WIDTH},h_${EMAIL_THUMB_HEIGHT},c_fill,q_auto,f_auto/`
  );
}

/**
 * Admin order emails: Cloudinary HTTPS URLs only (no base64, no local paths).
 * Falls back to a Cloudinary placeholder when missing or invalid.
 */
export function resolveAdminEmailProductImageUrl(raw?: string | null): string {
  const absolute = toAbsoluteHttpsUrl(raw);
  if (absolute && isCloudinaryHttpsUrl(absolute)) {
    return toCloudinaryEmailThumb(absolute);
  }
  return getAdminEmailProductPlaceholderUrl();
}
