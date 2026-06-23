"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { RefreshCw, UserPlus, Users, UserCheck } from "lucide-react";
import { AIGrowthPageShell } from "@/components/admin/ai-growth/AIGrowthPageShell";
import {
  AIGrowthEmptyState,
  AIGrowthInsightRow,
  AIGrowthSectionHeader
} from "@/components/admin/ai-growth/ai-growth-shared";
import { useAIGrowthContext } from "@/components/admin/ai-growth/ai-growth-context";
import {
  CHART_HEIGHT,
  KpiCard,
  PanelCard,
  formatCurrency
} from "@/components/admin/analytics/analytics-shared";
import {
  computeCustomerIntelligence,
  type CustomerAggregate
} from "@/lib/ai-growth/customer-intelligence";

function CustomerListRow({
  customer,
  rank
}: {
  customer: CustomerAggregate;
  rank?: number;
}) {
  return (
    <li className="flex items-center gap-2.5 rounded-lg border border-accent/10 bg-blush/15 px-2 py-2">
      {typeof rank === "number" ? (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[9px] font-bold text-foreground">
          {rank}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{customer.name}</p>
        <p className="text-[11px] text-foreground/55">
          {customer.orderCount} {customer.orderCount === 1 ? "order" : "orders"}
        </p>
      </div>
      <p className="shrink-0 text-sm font-bold tabular-nums text-primary">
        {formatCurrency(customer.revenue)}
      </p>
    </li>
  );
}

function CustomerTable({ customers }: { customers: CustomerAggregate[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-accent/15 text-left text-[11px] font-semibold uppercase tracking-wide text-foreground/50">
            <th className="pb-2 pr-3">Customer</th>
            <th className="pb-2 pr-3">Orders</th>
            <th className="pb-2 text-right">Revenue</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.key} className="border-b border-accent/10 last:border-0">
              <td className="py-2.5 pr-3">
                <span className="font-semibold text-foreground">{customer.name}</span>
              </td>
              <td className="py-2.5 pr-3 tabular-nums text-foreground/70">{customer.orderCount}</td>
              <td className="py-2.5 text-right font-semibold tabular-nums text-primary">
                {formatCurrency(customer.revenue)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CustomerIntelligenceClient() {
  const { orders, dateFilter } = useAIGrowthContext();

  const intelligence = useMemo(
    () => computeCustomerIntelligence(orders, dateFilter),
    [orders, dateFilter]
  );

  const hasPeriodCustomers = intelligence.totalCustomers > 0;

  return (
    <AIGrowthPageShell title="Customer Intelligence">
      {!hasPeriodCustomers ? (
        <AIGrowthEmptyState icon={Users} />
      ) : (
        <div className="space-y-4">
          <AIGrowthSectionHeader
            title="Customer Intelligence"
            subtitle="Customer counts and revenue from order data in the selected period"
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard icon={Users} label="Total Customers" value={String(intelligence.totalCustomers)} />
            <KpiCard icon={UserPlus} label="New Customers" value={String(intelligence.newCustomers)} />
            <KpiCard
              icon={UserCheck}
              label="Returning Customers"
              value={String(intelligence.returningCustomers)}
            />
            <KpiCard
              icon={RefreshCw}
              label="Repeat Purchase Rate"
              value={
                intelligence.repeatPurchaseRate === null
                  ? "—"
                  : `${intelligence.repeatPurchaseRate}%`
              }
            />
          </div>

          {intelligence.customerInsights.length > 0 ? (
            <PanelCard title="Customer Insights" subtitle="Selected period">
              <ul className="space-y-2">
                {intelligence.customerInsights.map((insight) => (
                  <AIGrowthInsightRow key={insight.id} tone={insight.tone} text={insight.text} />
                ))}
              </ul>
            </PanelCard>
          ) : null}

          {intelligence.topCustomers.length > 0 ? (
            <PanelCard title="Top Customers" subtitle="Ranked by revenue in the selected period">
              <ul className="space-y-2">
                {intelligence.topCustomers.slice(0, 10).map((customer, index) => (
                  <CustomerListRow key={customer.key} customer={customer} rank={index + 1} />
                ))}
              </ul>
            </PanelCard>
          ) : null}

          <PanelCard title="New vs Returning Customers" subtitle="Customers in the selected period">
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <BarChart
                data={intelligence.newVsReturning}
                layout="vertical"
                margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0d8e4" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} width={132} />
                <Tooltip formatter={(value: number) => [value, "Customers"]} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={28}>
                  {intelligence.newVsReturning.map((entry) => (
                    <Cell key={entry.label} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </PanelCard>

          {intelligence.lifetimeValueTop10.length > 0 ? (
            <PanelCard
              title="Customer Lifetime Value"
              subtitle="Top 10 customers by total revenue"
            >
              <CustomerTable customers={intelligence.lifetimeValueTop10} />
            </PanelCard>
          ) : null}

          {intelligence.repeatCustomers.length > 0 ? (
            <PanelCard title="Repeat Customers" subtitle="Customers with more than one order">
              <ul className="space-y-2">
                {intelligence.repeatCustomers.map((customer) => (
                  <CustomerListRow key={customer.key} customer={customer} />
                ))}
              </ul>
            </PanelCard>
          ) : null}
        </div>
      )}
    </AIGrowthPageShell>
  );
}
