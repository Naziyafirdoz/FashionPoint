import { StylistChatbotLazy } from "@/components/ai/StylistChatbotLazy";
import { AnnouncementBar } from "@/components/store/AnnouncementBar";
import { Navbar } from "@/components/store/Navbar";
import { Footer } from "@/components/store/Footer";
import { WishlistHydrator } from "@/components/wishlist/WishlistHydrator";
import { getActiveCategories } from "@/lib/categories/get-categories";
import { getPublicStoreInformation } from "@/lib/settings/store-information";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  let categories: Awaited<ReturnType<typeof getActiveCategories>> = [];

  try {
    categories = await getActiveCategories();
  } catch {
    categories = [];
  }

  const storeInformation = await getPublicStoreInformation();

  return (
    <>
      <WishlistHydrator />
      <AnnouncementBar phoneDisplay={storeInformation.phoneDisplay} telUrl={storeInformation.telUrl} />
      <Navbar categories={categories} storeName={storeInformation.storeName} />
      {children}
      <Footer categories={categories} store={storeInformation} />
      <StylistChatbotLazy />
    </>
  );
}
