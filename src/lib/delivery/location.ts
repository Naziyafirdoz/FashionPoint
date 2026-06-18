import { normalizeIndianMobile } from "@/lib/checkout/contact-validation";

export type ShippingAddressRecord = Record<string, string | undefined>;

export function composeAddressLine(address: {
  house_flat?: string;
  street?: string;
  landmark?: string;
  line?: string;
  line1?: string;
  line2?: string;
}): string {
  const houseFlat = address.house_flat?.trim() ?? "";
  const street = address.street?.trim() ?? "";
  const landmark = address.landmark?.trim() ?? "";
  const parts = [houseFlat, street, landmark].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");
  return [address.line ?? address.line1, address.line2].filter(Boolean).join(", ");
}

export function resolveHouseFlat(address?: ShippingAddressRecord | null): string {
  if (!address) return "";
  if (address.house_flat?.trim()) return address.house_flat.trim();
  return address.line ?? address.line1 ?? "";
}

export function resolveStreet(address?: ShippingAddressRecord | null): string {
  if (!address) return "";
  if (address.street?.trim()) return address.street.trim();
  return address.line2 ?? "";
}

export function resolveLandmark(address?: ShippingAddressRecord | null): string {
  if (!address) return "";
  return address.landmark?.trim() ?? "";
}

export function resolvePrimaryPhone(address?: ShippingAddressRecord | null): string {
  if (!address) return "";
  return address.phone?.trim() ?? "";
}

export function resolveSecondaryPhone(address?: ShippingAddressRecord | null): string {
  if (!address) return "";
  return address.secondary_phone?.trim() ?? "";
}

export function formatShippingAddressLines(address?: ShippingAddressRecord | null): string {
  if (!address) return "";

  const houseFlat = resolveHouseFlat(address);
  const street = resolveStreet(address);
  const landmark = resolveLandmark(address);
  const city = address.city ?? "";
  const state = address.state ?? "";
  const pincode = address.pincode ?? address.postal_code ?? "";

  return [houseFlat, street, landmark, city, state, pincode].filter(Boolean).join("\n");
}

export function formatAddressForCopy(address?: ShippingAddressRecord | null): string {
  if (!address) return "";
  return formatShippingAddressLines(address);
}

export function formatDeliveryDetailsForCopy(address?: ShippingAddressRecord | null): string {
  if (!address) return "";

  const name = address.name ?? "";
  const phone = resolvePrimaryPhone(address);
  const houseFlat = resolveHouseFlat(address);
  const street = resolveStreet(address);
  const landmark = resolveLandmark(address);
  const city = address.city ?? "";
  const state = address.state ?? "";
  const pincode = address.pincode ?? address.postal_code ?? "";

  return [
    `Customer: ${name}`,
    "",
    `Phone: ${phone}`,
    "",
    "Address:",
    houseFlat,
    ...(street ? [street] : []),
    ...(landmark ? [landmark] : []),
    city,
    state,
    pincode
  ]
    .join("\n")
    .trim();
}

export function buildOrderAddressPayload(
  contact: { name: string; phone: string; secondary_phone?: string; email: string },
  address: {
    house_flat: string;
    street: string;
    landmark: string;
    city: string;
    state: string;
    pincode: string;
  }
): Record<string, string> {
  const line = composeAddressLine({
    house_flat: address.house_flat,
    street: address.street,
    landmark: address.landmark
  });

  const secondaryRaw = contact.secondary_phone?.trim() ?? "";
  const normalizedSecondary = secondaryRaw ? normalizeIndianMobile(secondaryRaw) : "";

  const payload: Record<string, string> = {
    name: contact.name.trim(),
    phone: normalizeIndianMobile(contact.phone),
    email: contact.email.trim(),
    house_flat: address.house_flat.trim(),
    street: address.street.trim(),
    landmark: address.landmark.trim(),
    line,
    city: address.city.trim(),
    state: address.state.trim(),
    pincode: address.pincode.trim()
  };

  if (normalizedSecondary) {
    payload.secondary_phone = normalizedSecondary;
  }

  return payload;
}
