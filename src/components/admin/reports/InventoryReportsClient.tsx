"use client";

import { AdminLiveStatus } from "@/components/admin/AdminLiveStatus";
import { ReportsTableSkeleton } from "@/components/admin/reports/ReportsLoadingSkeleton";
import { ReportsPagination } from "@/components/admin/reports/ReportsPagination";
import { ReportsToolbar } from "@/components/admin/reports/ReportsToolbar";
import {
  ReportsErrorState,
  ReportsPageShell,
  ReportsSection,
  ReportsTable
} from "@/components/admin/reports/reports-shared";
import { useInventoryReportsPage } from "@/components/admin/reports/use-inventory-reports-page";
import type { InventoryReportProductRow } from "@/lib/admin/reports";

type InventorySectionPage = {
  items: InventoryReportProductRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type InventoryReportResponse = {
  sections: {
    lowStockProducts: InventorySectionPage;
    outOfStockProducts: InventorySectionPage;
    topSellingProducts: InventorySectionPage;
    slowMovingProducts: InventorySectionPage;
  };
  updatedAt: string;
  cached?: boolean;
};

const SECTIONS: { key: keyof InventoryReportResponse["sections"]; title: string }[] = [
  { key: "lowStockProducts", title: "Low Stock Products" },
  { key: "outOfStockProducts", title: "Out Of Stock Products" },
  { key: "topSellingProducts", title: "Top Selling Products" },
  { key: "slowMovingProducts", title: "Slow Moving Products" }
];

export function InventoryReportsClient() {
  const {
    query,
    updateQuery,
    data,
    loading,
    refreshing,
    error,
    lastUpdated,
    isLive,
    refresh
  } = useInventoryReportsPage<InventoryReportResponse>();

  const toolbar = (
    <ReportsToolbar
      query={query}
      onChange={updateQuery}
      searchPlaceholder="Search product name or SKU"
    />
  );

  return (
    <ReportsPageShell
      title="Inventory Reports"
      action={
        <div className="flex flex-wrap items-center justify-end gap-3">
          <AdminLiveStatus lastUpdated={lastUpdated} isLive={isLive} />
          <button
            type="button"
            className="rounded-lg border border-accent/30 bg-white px-3 py-1.5 text-sm text-foreground/70 hover:bg-blush disabled:opacity-60"
            onClick={() => void refresh()}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      }
    >
      {toolbar}
      {loading ? (
        <div className="space-y-4">
          {SECTIONS.map((section) => (
            <ReportsSection key={section.key} title={section.title}>
              <ReportsTableSkeleton />
            </ReportsSection>
          ))}
        </div>
      ) : error ? (
        <ReportsErrorState message={error} />
      ) : !data ? null : (
        <div className="space-y-4">
          {SECTIONS.map((section) => {
            const sectionData = data.sections[section.key];
            return (
              <ReportsSection
                key={section.key}
                title={section.title}
                footer={
                  section.key === "slowMovingProducts" ? (
                    <ReportsPagination
                      page={sectionData.page}
                      totalPages={sectionData.totalPages}
                      totalItems={sectionData.total}
                      pageSize={sectionData.limit}
                      onPageChange={(page) => updateQuery({ page })}
                    />
                  ) : null
                }
              >
                <ReportsTable
                  columns={["Product", "SKU", "Current Stock", "Units Sold", "Status"]}
                  rows={sectionData.items.map((row) => [
                    row.name,
                    row.sku || "—",
                    String(row.currentStock),
                    String(row.unitsSold),
                    row.statusLabel
                  ])}
                />
              </ReportsSection>
            );
          })}
        </div>
      )}
    </ReportsPageShell>
  );
}
