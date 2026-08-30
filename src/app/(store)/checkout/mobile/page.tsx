import { MobileCheckoutClient } from "@/app/(store)/checkout/mobile/MobileCheckoutClient";
import { getStoreInformation } from "@/lib/settings/store-information";

export default async function MobileCheckoutPage() {
  const { storeName } = await getStoreInformation();
  return <MobileCheckoutClient storeName={storeName} />;
}
