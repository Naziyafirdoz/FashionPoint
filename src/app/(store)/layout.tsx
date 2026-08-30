import { StylistChatbotLazy } from "@/components/ai/StylistChatbotLazy";
import { AnnouncementBar } from "@/components/store/AnnouncementBar";
import { Navbar } from "@/components/store/Navbar";
import { Footer } from "@/components/store/Footer";
import { StorefrontBrandingScope } from "@/components/store/StorefrontBrandingScope";
import { WishlistHydrator } from "@/components/wishlist/WishlistHydrator";
import { getActiveCategories } from "@/lib/categories/get-categories";
import { DEFAULT_STORE_BRANDING, resolveDisplayFontStack } from "@/lib/settings/store-branding";
import { getPublicStoreInformation } from "@/lib/settings/store-information";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  let categories: Awaited<ReturnType<typeof getActiveCategories>> = [];

  try {
    categories = await getActiveCategories();
  } catch {
    categories = [];
  }

  const storeInformation = await getPublicStoreInformation();
  const displayFont = resolveDisplayFontStack(
    storeInformation.branding?.fontFamily ?? DEFAULT_STORE_BRANDING.fontFamily
  );

  return (
    <StorefrontBrandingScope displayFont={displayFont}>
      <WishlistHydrator />
      <AnnouncementBar phoneDisplay={storeInformation.phoneDisplay} telUrl={storeInformation.telUrl} />
      <Navbar
        categories={categories}
        storeName={storeInformation.storeName}
        tagline={storeInformation.tagline}
        logoUrl={storeInformation.logoUrl}
      />
      {children}
      <Footer categories={categories} store={storeInformation} />
      <StylistChatbotLazy />
    </StorefrontBrandingScope>
  );
}
