import { ContactPageContent } from "@/app/(store)/contact/ContactPageContent";
import { getPublicStoreInformation } from "@/lib/settings/store-information";

export const metadata = { title: "Contact Us" };

export default async function ContactPage() {
  const store = await getPublicStoreInformation();

  return (
    <ContactPageContent
      storeName={store.storeName}
      address={store.address}
      phoneDisplay={store.phoneDisplay}
      telUrl={store.telUrl}
      supportEmail={store.supportEmail}
      whatsappUrl={store.whatsappUrl}
    />
  );
}
