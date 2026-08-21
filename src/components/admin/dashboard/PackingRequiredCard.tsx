import Link from "next/link";
import { Package } from "lucide-react";

type PackingRequiredCardProps = {
  count: number;
};

export function PackingRequiredCard({ count }: PackingRequiredCardProps) {
  if (count <= 0) return null;

  const label = count === 1 ? "1 order waiting" : `${count} orders waiting`;

  return (
    <Link
      href="/admin/orders?tab=confirmed"
      className="block rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-sm transition hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
          <Package className="h-5 w-5 text-amber-700" />
        </div>
        <div>
          <p className="font-semibold text-amber-900">📦 Ready for Shipping</p>
          <p className="mt-1 text-sm text-amber-800/90">{label} to pack and mark ready for courier.</p>
        </div>
      </div>
    </Link>
  );
}
