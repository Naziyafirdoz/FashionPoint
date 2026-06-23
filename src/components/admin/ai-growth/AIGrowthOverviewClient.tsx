"use client";

import { AIGrowthNavCards } from "@/components/admin/ai-growth/AIGrowthNavCards";
import { AIGrowthPageShell } from "@/components/admin/ai-growth/AIGrowthPageShell";
import { AIGrowthSectionHeader } from "@/components/admin/ai-growth/ai-growth-shared";

export function AIGrowthOverviewClient() {
  return (
    <AIGrowthPageShell title="AI Growth Intelligence">
      <div className="space-y-4">
        <AIGrowthSectionHeader
          title="Overview"
          subtitle="Customer, revenue, product, and conversion metrics from order data"
        />
        <AIGrowthNavCards />
      </div>
    </AIGrowthPageShell>
  );
}
