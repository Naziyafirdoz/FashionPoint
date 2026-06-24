"use client";

import { CheckCircle2, Package, ShoppingCart, Truck, XCircle } from "lucide-react";
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
import type { OrderReportKpis, OrderReportRow } from "@/lib/admin/reports";

type OrderReportResponse = {
  kpis: OrderReportKpis;
  rows: OrderReportRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  updatedAt: string;
};

export function OrderReportsClient() {
  const {
    query,
    updateQuery,
    data,
    loading,
    error,
    lastUpdated,
    isLive
  } = useReportsPage<OrderReportResponse>("/api/admin/reports/orders");

  const toolbar = (
    <ReportsToolbar
      query={query}
      onChange={updateQuery}
      searchPlaceholder="Search order ID, customer, or phone"
    />
  );

  return (
    <ReportsPageShell
      title="Order Reports"
      action={<AdminLiveStatus lastUpdated={lastUpdated} isLive={isLive} />}
    >
      {toolbar}
      {loading ? (
        <>
          <ReportsKpiSkeleton count={6} />
          <ReportsSection title="Orders">
            <ReportsTableSkeleton />
          </ReportsSection>
        </>
      ) : error ? (
        <ReportsErrorState message={error} />
      ) : !data ? null : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <KpiCard icon={ShoppingCart} label="Total Orders" value={String(data.kpis.totalOrders)} />
            <KpiCard icon={Package} label="Processing" value={String(data.kpis.processing)} />
            <KpiCard icon={CheckCircle2} label="Confirmed" value={String(data.kpis.confirmed)} />
            <KpiCard icon={Truck} label="Shipped" value={String(data.kpis.shipped)} />
            <KpiCard icon={CheckCircle2} label="Delivered" value={String(data.kpis.delivered)} />
            <KpiCard icon={XCircle} label="Cancelled" value={String(data.kpis.cancelled)} />
          </div>

          <ReportsSection
            title="Orders"
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
              columns={["Order ID", "Customer", "Date", "Status", "Amount"]}
              rows={data.rows.map((row) => [
                row.orderNumber,
                row.customer,
                row.dateLabel,
                row.statusLabel,
                formatCurrency(row.amount)
              ])}
            />
          </ReportsSection>
        </>
      )}
    </ReportsPageShell>
  );
}
