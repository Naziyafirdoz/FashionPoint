import { normalizePincode } from "@/lib/shipping/pincode-lookup";

/** Approved Vijayawada pincodes eligible for ₹99 shipping. */
export const VIJAYAWADA_SHIPPING_PINCODES = [
  "520001",
  "520002",
  "520003",
  "520004",
  "520005",
  "520006",
  "520007",
  "520008",
  "520009",
  "520010",
  "520011",
  "520012",
  "520013",
  "520014",
  "520015",
  "520016"
] as const;

const VIJAYAWADA_PINCODE_SET = new Set<string>(VIJAYAWADA_SHIPPING_PINCODES);

export function isVijayawadaShippingPincode(pincode: string | undefined): boolean {
  return VIJAYAWADA_PINCODE_SET.has(normalizePincode(pincode ?? ""));
}
