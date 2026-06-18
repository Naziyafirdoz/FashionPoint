import {
  normalizeIndianMobile,
  validateCheckoutContact
} from "@/lib/checkout/contact-validation";
import {
  lookupPincode,
  normalizePincode,
  pincodeMatchesLocation,
  type PincodeLookupResult
} from "@/lib/shipping/pincode-lookup";

export type AddressLocationFields = {
  city: string;
  state: string;
  pincode: string;
};

export type AddressValidationFailure = {
  ok: false;
  entered: AddressLocationFields;
  detected: Pick<PincodeLookupResult, "city" | "state"> | null;
};

export type AddressValidationSuccess = {
  ok: true;
  city: string;
  state: string;
  pincode: string;
};

export type AddressValidationResult = AddressValidationFailure | AddressValidationSuccess;

export async function validateAddressLocation(
  fields: AddressLocationFields
): Promise<AddressValidationResult> {
  const entered = {
    city: fields.city.trim(),
    state: fields.state.trim(),
    pincode: normalizePincode(fields.pincode)
  };

  if (entered.pincode.length !== 6) {
    return { ok: false, entered, detected: null };
  }

  const detected = await lookupPincode(entered.pincode);
  if (!detected) {
    return { ok: false, entered, detected: null };
  }

  if (!pincodeMatchesLocation(entered, detected)) {
    return {
      ok: false,
      entered,
      detected: { city: detected.city, state: detected.state }
    };
  }

  return {
    ok: true,
    city: detected.city,
    state: detected.state,
    pincode: detected.pincode
  };
}

function validateOrderContactFields(address: Record<string, unknown>): string | null {
  const contact = validateCheckoutContact({
    name: String(address.name ?? ""),
    phone: String(address.phone ?? ""),
    secondary_phone: String(address.secondary_phone ?? ""),
    email: String(address.email ?? "")
  });
  if (!contact.ok) return contact.message;
  return null;
}

function validateOrderAddressFields(address: Record<string, unknown>): string | null {
  const houseFlat = String(address.house_flat ?? address.line ?? "").trim();
  const street = String(address.street ?? "").trim();
  const landmark = String(address.landmark ?? "").trim();

  if (!houseFlat) return "Door / house / flat number is required.";
  if (!street) return "Street / area is required.";
  if (!landmark) return "Landmark is required.";

  return null;
}

export async function resolveValidatedOrderAddress(
  address: Record<string, unknown> | null | undefined
): Promise<
  | { ok: true; address: Record<string, unknown> }
  | { ok: false; error: string }
> {
  if (!address) {
    return { ok: false, error: "Delivery address is required." };
  }

  const contactError = validateOrderContactFields(address);
  if (contactError) {
    return { ok: false, error: contactError };
  }

  const addressError = validateOrderAddressFields(address);
  if (addressError) {
    return { ok: false, error: addressError };
  }

  const validation = await validateAddressLocation({
    city: String(address.city ?? ""),
    state: String(address.state ?? ""),
    pincode: String(address.pincode ?? address.postal_code ?? "")
  });

  if (!validation.ok) {
    return {
      ok: false,
      error: "The entered City, State, and Pincode do not match. Please verify your address."
    };
  }

  const normalizedPhone = normalizeIndianMobile(String(address.phone ?? ""));
  const secondaryRaw = String(address.secondary_phone ?? "").trim();
  const normalizedSecondary = secondaryRaw ? normalizeIndianMobile(secondaryRaw) : "";

  const sanitized: Record<string, unknown> = { ...address };
  for (const key of [
    "latitude",
    "longitude",
    "google_maps_url",
    "google_maps_link",
    "googleMapsUrl",
    "gps_accuracy",
    "accuracy",
    "location_address",
    "location_shared",
    "location_method",
    "captured_location",
    "location_coordinates",
    "address_mode",
    "shipping_pincode"
  ]) {
    delete sanitized[key];
  }

  return {
    ok: true,
    address: {
      ...sanitized,
      name: String(address.name ?? "").trim(),
      phone: normalizedPhone,
      email: String(address.email ?? "").trim(),
      city: validation.city,
      state: validation.state,
      pincode: validation.pincode,
      ...(normalizedSecondary ? { secondary_phone: normalizedSecondary } : {})
    }
  };
}
