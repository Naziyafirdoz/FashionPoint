import Link from "next/link";
import { RotateCcw } from "lucide-react";

type RefundRequestsCardProps = {
  count: number;
};

export function RefundRequestsCard({ count }: RefundRequestsCardProps) {
  if (count <= 0) return null;

  const label = count === 1 ? "1 refund request" : `${count} refund requests`;

  return (
    <Link
      href="/admin/orders?tab=refund_pending"
      className="block rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 p-5 shadow-sm transition hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100">
          <RotateCcw className="h-5 w-5 text-violet-700" />
        </div>
        <div>
          <p className="font-semibold text-violet-900">Refund Requests</p>
          <p className="mt-1 text-sm text-violet-800/90">{label} pending processing.</p>
        </div>
      </div>
    </Link>
  );
}
