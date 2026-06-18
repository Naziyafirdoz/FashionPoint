import { isVijayawadaShippingPincode } from "@/lib/shipping/vijayawada-pincodes";

export type ShippingAddressInput = {
  city?: string;
  state?: string;
  pincode?: string;
  line?: string;
  line1?: string;
  line2?: string;
};

export function detectDeliveryCity(address: ShippingAddressInput): string {
  if (isVijayawadaShippingPincode(address.pincode)) {
    return "Vijayawada";
  }
  return address.city?.trim() ?? "";
}

export type ShippingLocationTier = "vijayawada_city" | "other";

export function resolveShippingLocationTier(address: ShippingAddressInput): ShippingLocationTier {
  return isVijayawadaShippingPincode(address.pincode) ? "vijayawada_city" : "other";
}

export function isVijayawadaDelivery(address: ShippingAddressInput): boolean {
  return resolveShippingLocationTier(address) === "vijayawada_city";
}

export type ShippingZone = "local" | "outskirts" | "outstation";

export function resolveShippingZone(address: ShippingAddressInput): ShippingZone {
  return resolveShippingLocationTier(address) === "vijayawada_city" ? "local" : "outstation";
}
