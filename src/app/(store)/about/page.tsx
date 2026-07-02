import { AboutPageContent } from "@/app/(store)/about/AboutPageContent";
import { STORE_NAME } from "@/lib/site-config";

export const metadata = {
  title: "About Us",
  description: `Learn about ${STORE_NAME} — premium ready-made Indian blouses, AI-powered fit guidance, and trusted service in Vijayawada.`
};

export default function AboutPage() {
  return <AboutPageContent />;
}
