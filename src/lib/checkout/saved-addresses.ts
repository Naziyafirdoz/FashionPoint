import type { CheckoutAddress } from "@/components/store/CheckoutForm";
import type { Address } from "@/types";

export function addressToCheckoutAddress(address: Address, email: string): CheckoutAddress {
  return {
    name: address.name ?? "",
    phone: address.phone ?? "",
    secondary_phone: "",
    email,
    house_flat: address.line1 ?? "",
    street: address.line2 ?? "",
    landmark: "",
    city: address.city ?? "",
    state: address.state ?? "",
    pincode: address.pincode ?? ""
  };
}

export function checkoutAddressToSavePayload(address: CheckoutAddress) {
  const landmark = address.landmark.trim();
  const street = address.street.trim();
  const line2 = landmark ? (street ? `${street}, ${landmark}` : landmark) : street;

  return {
    name: address.name.trim(),
    phone: address.phone.trim(),
    line1: address.house_flat.trim(),
    line2: line2 || null,
    city: address.city.trim(),
    state: address.state.trim(),
    pincode: address.pincode.trim()
  };
}
