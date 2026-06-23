"use client";

import {
  CircleDollarSign,
  Lightbulb,
  Package,
  Target,
  Users,
  type LucideIcon
} from "lucide-react";
import { AIGrowthPageShell } from "@/components/admin/ai-growth/AIGrowthPageShell";
import {
  AIGrowthInsufficientDataCard,
  AIGrowthSectionHeader
} from "@/components/admin/ai-growth/ai-growth-shared";

export type AIGrowthSection = "customers" | "revenue" | "products" | "conversion" | "suggestions";

const SECTION_ICONS: Record<AIGrowthSection, LucideIcon> = {
  customers: Users,
  revenue: CircleDollarSign,
  products: Package,
  conversion: Target,
  suggestions: Lightbulb
};

type AIGrowthSectionPageProps = {
  shellTitle: string;
  sectionTitle: string;
  subtitle: string;
  section: AIGrowthSection;
};

export function AIGrowthSectionPage({
  shellTitle,
  sectionTitle,
  subtitle,
  section
}: AIGrowthSectionPageProps) {
  const PlaceholderIcon = SECTION_ICONS[section];

  return (
    <AIGrowthPageShell title={shellTitle}>
      <div className="space-y-4">
        <AIGrowthSectionHeader title={sectionTitle} subtitle={subtitle} />
        <AIGrowthInsufficientDataCard icon={PlaceholderIcon} />
      </div>
    </AIGrowthPageShell>
  );
}
