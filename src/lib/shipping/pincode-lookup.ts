const VIJAYAWADA_PINCODE_PREFIX = "520";
const PINCODE_API = "https://api.postalpincode.in/pincode";

export type PincodePostOffice = {
  Name: string;
  District: string;
  State: string;
  Division?: string;
  Region?: string;
  DeliveryStatus?: string;
  Pincode: string;
};

export type PincodeLookupResult = {
  pincode: string;
  city: string;
  state: string;
};

type PincodeApiPayload = {
  Status: string;
  Message?: string;
  PostOffice?: PincodePostOffice[] | null;
};

export function normalizePincode(value: string): string {
  return value.replace(/\D/g, "").slice(0, 6);
}

export function normalizeLocationName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\bbangalore\b/g, "bengaluru")
    .replace(/\s+/g, " ")
    .trim();
}

export function locationNamesMatch(a: string, b: string): boolean {
  const left = normalizeLocationName(a);
  const right = normalizeLocationName(b);
  if (!left || !right) return false;
  if (left === right) return true;
  return left.includes(right) || right.includes(left);
}

function resolveCityFromOffices(pincode: string, offices: PincodePostOffice[]): string {
  if (pincode.startsWith(VIJAYAWADA_PINCODE_PREFIX)) {
    return "Vijayawada";
  }

  const deliveryOffice =
    offices.find((office) => office.DeliveryStatus === "Delivery") ?? offices[0];
  if (!deliveryOffice) return "";

  return (
    deliveryOffice.District?.trim() ||
    deliveryOffice.Division?.trim() ||
    deliveryOffice.Name?.trim() ||
    ""
  );
}

function parsePincodeApiPayload(payload: PincodeApiPayload, pincode: string): PincodeLookupResult | null {
  if (payload.Status !== "Success" || !payload.PostOffice?.length) {
    return null;
  }

  const state = payload.PostOffice[0]?.State?.trim();
  const city = resolveCityFromOffices(pincode, payload.PostOffice);
  if (!city || !state) return null;

  return { pincode, city, state };
}

export async function lookupPincode(pincodeInput: string): Promise<PincodeLookupResult | null> {
  const pincode = normalizePincode(pincodeInput);
  if (pincode.length !== 6) return null;

  try {
    const res = await fetch(`${PINCODE_API}/${pincode}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 }
    });

    if (!res.ok) return null;

    const raw = (await res.json()) as PincodeApiPayload | PincodeApiPayload[];
    const payload = Array.isArray(raw) ? raw[0] : raw;
    if (!payload) return null;

    return parsePincodeApiPayload(payload, pincode);
  } catch {
    return null;
  }
}

export function pincodeMatchesLocation(
  entered: { city: string; state: string; pincode: string },
  detected: PincodeLookupResult
): boolean {
  const pincode = normalizePincode(entered.pincode);
  if (pincode !== detected.pincode) return false;
  return (
    locationNamesMatch(entered.city, detected.city) &&
    locationNamesMatch(entered.state, detected.state)
  );
}
