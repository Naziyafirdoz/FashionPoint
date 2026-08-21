import type { Order } from "@/types";
import { FULFILLMENT_META_KEY } from "@/lib/orders/rapido-delivery-metadata";

export const DTDC_COURIER_NAME = "DTDC";

export const DTDC_MISSING_IMAGE_ERROR =
  "Please upload and save the DTDC parcel image before marking this order as shipped.";

export type DtdcParcelDetails = {
  image_url: string;
  uploaded_at: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value != null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function readFulfillmentMeta(
  address?: Record<string, unknown> | null
): Record<string, unknown> | null {
  if (!address) return null;
  return asRecord(address[FULFILLMENT_META_KEY]);
}

export function isCloudinaryHttpsImageUrl(url: string | undefined | null): url is string {
  const trimmed = url?.trim();
  if (!trimmed) return false;

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("data:") ||
    lower.startsWith("blob:") ||
    lower.includes("base64") ||
    lower.includes("localhost") ||
    lower.includes("127.0.0.1")
  ) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" && parsed.hostname === "res.cloudinary.com";
  } catch {
    return false;
  }
}

export function getDtdcParcelDetails(
  order: Pick<Order, "shipping_address">
): DtdcParcelDetails | null {
  const meta = readFulfillmentMeta(order.shipping_address as Record<string, unknown> | undefined);
  const raw = asRecord(meta?.dtdc_parcel);
  if (!raw) return null;

  const imageUrl = typeof raw.image_url === "string" ? raw.image_url.trim() : "";
  const uploadedAt = typeof raw.uploaded_at === "string" ? raw.uploaded_at.trim() : "";
  if (!isCloudinaryHttpsImageUrl(imageUrl)) return null;

  return {
    image_url: imageUrl,
    uploaded_at: uploadedAt
  };
}

export function hasSavedDtdcParcelImage(order: Pick<Order, "shipping_address">): boolean {
  return getDtdcParcelDetails(order) != null;
}

export function buildShippingAddressWithDtdcParcel(
  existing: Record<string, unknown> | null | undefined,
  parcel: DtdcParcelDetails
): Record<string, unknown> {
  const base = { ...(existing ?? {}) };
  const priorMeta = readFulfillmentMeta(base) ?? {};
  base[FULFILLMENT_META_KEY] = {
    ...priorMeta,
    dtdc_parcel: {
      image_url: parcel.image_url,
      uploaded_at: parcel.uploaded_at
    }
  };
  return base;
}
