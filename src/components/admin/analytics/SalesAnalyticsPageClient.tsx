"use client";

import { AnalyticsPageShell } from "@/components/admin/analytics/AnalyticsPageShell";
import { SalesAnalyticsSection } from "@/components/admin/analytics/SalesAnalyticsSection";

export function SalesAnalyticsPageClient() {
  return (
    <AnalyticsPageShell title="Sales Analytics">
      <SalesAnalyticsSection />
    </AnalyticsPageShell>
  );
}
