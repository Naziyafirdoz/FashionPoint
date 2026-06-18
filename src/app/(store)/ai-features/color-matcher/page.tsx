import { ColorMatcherClient } from "@/components/ai/ColorMatcherClient";

export const metadata = {
  title: "Saree Color Matcher | Fashion Point",
  description: "Upload your saree and discover matching blouse colors with AI-powered analysis."
};

export default function ColorMatcherPage() {
  return <ColorMatcherClient />;
}
