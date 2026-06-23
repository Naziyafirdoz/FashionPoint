import { AIGrowthProvider } from "@/components/admin/ai-growth/ai-growth-context";

export default function AdminAIGrowthLayout({ children }: { children: React.ReactNode }) {
  return <AIGrowthProvider>{children}</AIGrowthProvider>;
}
