import { StylistChatbotLazy } from "@/components/ai/StylistChatbotLazy";
import { AnnouncementBar } from "@/components/store/AnnouncementBar";
import { Navbar } from "@/components/store/Navbar";
import { Footer } from "@/components/store/Footer";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      {children}
      <Footer />
      <StylistChatbotLazy />
    </>
  );
}
