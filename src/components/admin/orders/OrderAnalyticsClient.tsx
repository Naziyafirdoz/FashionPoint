"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { BarChart3 } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { StatsCard } from "@/components/admin/StatsCard";
import { EmptyState } from "@/components/admin/dashboard/EmptyState";
import { applyPaymentRulesToOrder } from "@/lib/orders/payment-rules";
import { computeOrderAnalytics } from "@/lib/orders/analytics";
import { computeRefundAnalytics } from "@/lib/orders/refunds";
import { computeAdminOrderStatsV2 } from "@/lib/orders/refund-queue";
import { RETURNS_EXCHANGES_REFUNDS_DISABLED } from "@/lib/store-policy";
import type { Order, ReturnRequest } from "@/types";

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  processing: "#f97316",
  shipped: "#3b82f6",
  delivered: "#22c55e",
  cancelled: "#ef4444",
  returned: "#f97316"
};

function formatCurrency(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

export function OrderAnalyticsClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const requests = RETURNS_EXCHANGES_REFUNDS_DISABLED
      ? [fetch("/api/orders")]
      : [fetch("/api/orders"), fetch("/api/admin/return-requests")];

    Promise.all(requests)
      .then(async (responses) => {
        const ordersRes = responses[0];
        const ordersData = await ordersRes.json();
        setOrders(ordersData.orders ?? []);
        if (!RETURNS_EXCHANGES_REFUNDS_DISABLED && responses[1]) {
          const returnsData = await responses[1].json();
          setReturnRequests(returnsData.return_requests ?? []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const normalizedOrders = useMemo(
    () => orders.map((o) => applyPaymentRulesToOrder(o)),
    [orders]
  );

  const { summary, ordersByMonth, statusDistribution } = useMemo(
    () => computeOrderAnalytics(normalizedOrders),
    [normalizedOrders]
  );

  const refundSummary = useMemo(
    () => computeRefundAnalytics(normalizedOrders),
    [normalizedOrders]
  );

  const v2Stats = useMemo(
    () => computeAdminOrderStatsV2(normalizedOrders, returnRequests),
    [normalizedOrders, returnRequests]
  );

  const refundThisMonth = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    return normalizedOrders
      .filter((o) => {
        if (o.payment_status !== "refunded" || !o.refund_date) return false;
        const d = new Date(o.refund_date);
        return d.getMonth() === month && d.getFullYear() === year;
      })
      .reduce((sum, o) => sum + Number(o.refund_amount ?? o.total ?? 0), 0);
  }, [normalizedOrders]);

  const hasData = orders.length > 0;

  return (
    <>
      <AdminHeader title="Order Analytics" />
      <div className="space-y-6 p-6">
        <Link href="/admin/orders" className="text-sm text-primary underline">
          ← Back to orders
        </Link>

        {loading ? (
          <p className="text-sm text-foreground/60">Loading analytics…</p>
        ) : !hasData ? (
          <EmptyState
            icon={BarChart3}
            title="No order data yet"
            description="Analytics will appear once orders are placed."
          />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatsCard label="Total Orders" value={String(summary.totalOrders)} />
              <StatsCard label="Revenue" value={formatCurrency(summary.revenue)} />
              <StatsCard
                label="Average Order Value"
                value={formatCurrency(Math.round(summary.averageOrderValue))}
              />
              <StatsCard label="Pending Orders" value={String(summary.pendingOrders)} />
              <StatsCard label="Processing Orders" value={String(summary.processingOrders)} />
              <StatsCard label="Out For Delivery" value={String(summary.outForDeliveryOrders)} />
              <StatsCard label="Delivered Orders" value={String(summary.deliveredOrders)} />
              <StatsCard label="Cancelled Orders" value={String(summary.cancelledOrders)} />
            </div>

            {!RETURNS_EXCHANGES_REFUNDS_DISABLED ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                  label="Refund Requests"
                  value={String(refundSummary.totalRefundRequests)}
                />
                <StatsCard label="Refund Pending" value={String(refundSummary.refundPending)} />
                <StatsCard label="Refund Completed" value={String(refundSummary.refundCompleted)} />
                <StatsCard
                  label="Total Refunded Amount"
                  value={formatCurrency(refundSummary.totalRefundedAmount)}
                />
                {refundSummary.averageProcessingDays != null ? (
                  <StatsCard
                    label="Avg Refund Processing Time"
                    value={`${refundSummary.averageProcessingDays} business days`}
                  />
                ) : null}
                <StatsCard
                  label="Refund Amount This Month"
                  value={formatCurrency(refundThisMonth)}
                />
                <StatsCard label="Return Requests" value={String(v2Stats.returnRequests)} />
                <StatsCard label="Approved Returns" value={String(v2Stats.returnsApproved)} />
                <StatsCard label="Cancelled Orders" value={String(v2Stats.cancelled)} />
              </div>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-accent/20 bg-white p-6 shadow-card">
                <h2 className="font-semibold text-primary">Orders by Month</h2>
                <div className="mt-4 h-64">
                  {ordersByMonth.length === 0 ? (
                    <p className="text-sm text-foreground/50">No monthly data available.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ordersByMonth}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0d8e4" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="orders" fill="#7b0d2b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-accent/20 bg-white p-6 shadow-card">
                <h2 className="font-semibold text-primary">Revenue by Month</h2>
                <div className="mt-4 h-64">
                  {ordersByMonth.length === 0 ? (
                    <p className="text-sm text-foreground/50">No monthly revenue data.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ordersByMonth}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0d8e4" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v) => (v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`)}
                        />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Bar dataKey="revenue" fill="#7b0d2b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-accent/20 bg-white p-6 shadow-card lg:col-span-2">
                <h2 className="font-semibold text-primary">Status Distribution</h2>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ status, count }) => `${status}: ${count}`}
                      >
                        {statusDistribution.map((entry) => (
                          <Cell
                            key={entry.status}
                            fill={STATUS_COLORS[entry.status] ?? "#9ca3af"}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
