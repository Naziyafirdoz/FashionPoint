import Link from "next/link";
import { AlertTriangle } from "lucide-react";

type ActionRequiredBannerProps = {
  pendingCount: number;
};

export function ActionRequiredBanner({ pendingCount }: ActionRequiredBannerProps) {
  if (pendingCount <= 0) return null;

  const label = pendingCount === 1 ? "1 order is" : `${pendingCount} orders are`;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 to-rose-50 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-5 w-5 text-red-600" />
        </div>
        <div>
          <p className="font-semibold text-red-900">⚠ Action Required</p>
          <p className="mt-1 text-sm text-red-800/90">
            {label} waiting for approval.
          </p>
        </div>
      </div>
      <Link
        href="/admin/orders?tab=processing"
        className="inline-flex shrink-0 items-center justify-center rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
      >
        View Orders
      </Link>
    </div>
  );
}
