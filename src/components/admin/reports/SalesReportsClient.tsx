"use client";

import {
  CircleDollarSign,
  Receipt,
  RotateCcw,
  ShoppingBag,
  Wallet
} from "lucide-react";
import { formatCurrency, KpiCard } from "@/components/admin/analytics/analytics-shared";
import { AdminLiveStatus } from "@/components/admin/AdminLiveStatus";
import { ReportsKpiSkeleton, ReportsTableSkeleton } from "@/components/admin/reports/ReportsLoadingSkeleton";
import { ReportsPagination } from "@/components/admin/reports/ReportsPagination";
import { ReportsToolbar } from "@/components/admin/reports/ReportsToolbar";
import {
  ReportsErrorState,
  ReportsPageShell,
  ReportsSection,
  ReportsTable
} from "@/components/admin/reports/reports-shared";
import { useReportsPage } from "@/components/admin/reports/use-reports-page";
import type { SalesReportKpis, SalesReportRow } from "@/lib/admin/reports";

type SalesReportResponse = {
  kpis: SalesReportKpis;
  tableLabel: "daily" | "orders";
  rows: Array<SalesReportRow & { orderNumber?: string }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  updatedAt: string;
};

export function SalesReportsClient() {
  const {
    query,
    updateQuery,
    data,
    loading,
    error,
    lastUpdated,
    isLive
  } = useReportsPage<SalesReportResponse>("/api/admin/reports/sales");

  const toolbar = (
    <ReportsToolbar
      query={query}
      onChange={updateQuery}
      searchPlaceholder="Search by order ID"
    />
  );

  const isOrderSearch = Boolean(query.search.trim()) || data?.tableLabel === "orders";

  return (
    <ReportsPageShell
      title="Sales Reports"
      action={<AdminLiveStatus lastUpdated={lastUpdated} isLive={isLive} />}
    >
      {toolbar}
      {loading ? (
        <>
          <ReportsKpiSkeleton count={5} />
          <ReportsSection title="Daily Sales">
            <ReportsTableSkeleton />
          </ReportsSection>
        </>
      ) : error ? (
        <ReportsErrorState message={error} />
      ) : !data ? null : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <KpiCard icon={CircleDollarSign} label="Total Revenue" value={formatCurrency(data.kpis.totalRevenue)} />
            <KpiCard icon={ShoppingBag} label="Total Orders" value={String(data.kpis.totalOrders)} />
            <KpiCard icon={Wallet} label="Average Order Value" value={formatCurrency(data.kpis.averageOrderValue)} />
            <KpiCard icon={RotateCcw} label="Refund Amount" value={formatCurrency(data.kpis.refundAmount)} />
            <KpiCard icon={Receipt} label="Net Revenue" value={formatCurrency(data.kpis.netRevenue)} />
          </div>

          <ReportsSection
            title={isOrderSearch ? "Matching Orders" : "Daily Sales"}
            footer={
              <ReportsPagination
                page={data.page}
                totalPages={data.totalPages}
                totalItems={data.total}
                pageSize={data.limit}
                onPageChange={(page) => updateQuery({ page })}
              />
            }
          >
            <ReportsTable
              columns={
                isOrderSearch
                  ? ["Order ID", "Date", "Revenue", "Refunds", "Net Revenue"]
                  : ["Date", "Orders", "Revenue", "Refunds", "Net Revenue"]
              }
              rows={data.rows.map((row) =>
                isOrderSearch
                  ? [
                      row.orderNumber ?? "—",
                      row.dateLabel,
                      formatCurrency(row.revenue),
                      formatCurrency(row.refunds),
                      formatCurrency(row.netRevenue)
                    ]
                  : [
                      row.dateLabel,
                      String(row.orders),
                      formatCurrency(row.revenue),
                      formatCurrency(row.refunds),
                      formatCurrency(row.netRevenue)
                    ]
              )}
            />
          </ReportsSection>
        </>
      )}
    </ReportsPageShell>
  );
}
