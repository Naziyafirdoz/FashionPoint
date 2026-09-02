import { ColorMatcherClient } from "@/components/ai/ColorMatcherClient";
import { getStoreInformation } from "@/lib/settings/store-information";

export const metadata = {
  title: "Saree Color Matcher",
  description: "Upload your saree and discover matching blouse colors with AI-powered analysis."
};

export default async function ColorMatcherPage() {
  const { storeName } = await getStoreInformation();
  return <ColorMatcherClient storeName={storeName} />;
}
