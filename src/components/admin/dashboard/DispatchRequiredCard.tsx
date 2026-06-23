import Link from "next/link";
import { Truck } from "lucide-react";

type DispatchRequiredCardProps = {
  count: number;
};

export function DispatchRequiredCard({ count }: DispatchRequiredCardProps) {
  if (count <= 0) return null;

  const label = count === 1 ? "1 order waiting" : `${count} orders waiting`;

  return (
    <Link
      href="/admin/orders?tab=ready_to_ship"
      className="block rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50 p-5 shadow-sm transition hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100">
          <Truck className="h-5 w-5 text-indigo-700" />
        </div>
        <div>
          <p className="font-semibold text-indigo-900">🚚 Ready To Dispatch</p>
          <p className="mt-1 text-sm text-indigo-800/90">{label} for courier handover.</p>
        </div>
      </div>
    </Link>
  );
}
