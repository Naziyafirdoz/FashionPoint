import { AboutPageContent } from "@/app/(store)/about/AboutPageContent";
import { getPublicStoreInformation } from "@/lib/settings/store-information";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const store = await getPublicStoreInformation();
  return {
    title: "About Us",
    description: `Learn about ${store.storeName} — premium ready-made Indian blouses, AI-powered fit guidance, and trusted service.`
  };
}

export default async function AboutPage() {
  const store = await getPublicStoreInformation();

  return (
    <AboutPageContent
      storeName={store.storeName}
      tagline={store.tagline}
      address={store.address}
      phoneDisplay={store.phoneDisplay}
      telUrl={store.telUrl}
      supportEmail={store.supportEmail}
    />
  );
}
