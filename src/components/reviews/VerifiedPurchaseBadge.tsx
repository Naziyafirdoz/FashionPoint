import { Check } from "lucide-react";

export function VerifiedPurchaseBadge() {
  return (
    <span className="inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-full border border-green-300 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-800 shadow-sm">
      <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>Verified Purchase</span>
      <span className="text-green-700/80">· Purchased &amp; Delivered</span>
    </span>
  );
}
