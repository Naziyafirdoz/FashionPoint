import Link from "next/link";
import { Ban } from "lucide-react";

type CancellationRequestsCardProps = {
  count: number;
};

export function CancellationRequestsCard({ count }: CancellationRequestsCardProps) {
  if (count <= 0) return null;

  const label = count === 1 ? "1 cancellation request" : `${count} cancellation requests`;

  return (
    <Link
      href="/admin/orders?tab=cancel_requested"
      className="block rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-red-50 p-5 shadow-sm transition hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100">
          <Ban className="h-5 w-5 text-rose-700" />
        </div>
        <div>
          <p className="font-semibold text-rose-900">Cancellation Requests</p>
          <p className="mt-1 text-sm text-rose-800/90">{label} awaiting review.</p>
        </div>
      </div>
    </Link>
  );
}
