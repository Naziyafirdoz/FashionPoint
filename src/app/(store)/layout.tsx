import { AnnouncementBar } from "@/components/store/AnnouncementBar";
import { Navbar } from "@/components/store/Navbar";
import { Footer } from "@/components/store/Footer";
import { StylistChatbot } from "@/components/ai/StylistChatbot";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      {children}
      <Footer />
      <StylistChatbot />
    </>
  );
}
