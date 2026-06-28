import { StylistChatbotLazy } from "@/components/ai/StylistChatbotLazy";
import { AnnouncementBar } from "@/components/store/AnnouncementBar";
import { Navbar } from "@/components/store/Navbar";
import { Footer } from "@/components/store/Footer";
import { getActiveCategories } from "@/lib/categories/get-categories";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  let categories: Awaited<ReturnType<typeof getActiveCategories>> = [];

  try {
    categories = await getActiveCategories();
  } catch {
    categories = [];
  }

  return (
    <>
      <AnnouncementBar />
      <Navbar categories={categories} />
      {children}
      <Footer />
      <StylistChatbotLazy />
    </>
  );
}
