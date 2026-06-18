import { LegalPage } from "@/components/legal/LegalPage";
import { SHIPPING_BEFORE_ADDRESS_MESSAGE } from "@/lib/shipping/display";

export const metadata = { title: "Shipping Policy" };

export default function ShippingPolicyPage() {
  return (
    <LegalPage title="Shipping Policy">
      <p>{SHIPPING_BEFORE_ADDRESS_MESSAGE}</p>
      <p className="mt-4">
        Enter your full delivery address during checkout to see the applicable shipping charge and
        estimated delivery window for your location.
      </p>
      <p className="mt-4">
        Parcels are dispatched via our delivery partner after your order is confirmed. Tracking
        details are shared once the parcel is booked.
      </p>
    </LegalPage>
  );
}
