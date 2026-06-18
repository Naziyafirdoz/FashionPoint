import { PieChart } from "lucide-react";
import type { DashboardChannelSale } from "@/lib/admin/dashboard";
import { EmptyState } from "./EmptyState";

export function SalesByChannelCard({
  salesByChannel
}: {
  salesByChannel: DashboardChannelSale[] | null;
}) {
  return (
    <div className="rounded-2xl border border-accent/20 bg-white p-6 shadow-card">
      <h2 className="font-semibold text-primary">Sales by Channel</h2>
      <p className="text-xs text-foreground/50">Breakdown by acquisition source</p>

      <div className="mt-6">
        {!salesByChannel || salesByChannel.length === 0 ? (
          <EmptyState
            icon={PieChart}
            title="No channel data available."
            description="Channel attribution will show here when order source data is recorded."
          />
        ) : (
          <ul className="space-y-3">
            {salesByChannel.map((row) => (
              <li
                key={row.channel}
                className="flex items-center justify-between rounded-lg border border-accent/10 bg-blush/20 px-4 py-3 text-sm"
              >
                <span className="font-medium capitalize">{row.channel}</span>
                <div className="text-right">
                  <p className="font-semibold text-primary">
                    ₹{row.revenue.toLocaleString("en-IN")}
                  </p>
                  <p className="text-xs text-foreground/50">
                    {row.orders} order{row.orders !== 1 ? "s" : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
