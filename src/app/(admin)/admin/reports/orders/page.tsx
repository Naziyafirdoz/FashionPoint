import { Suspense } from "react";
import { OrderReportsClient } from "@/components/admin/reports/OrderReportsClient";

export default function OrderReportsPage() {
  return (
    <Suspense fallback={<div className="bg-blush/30 p-6 text-sm text-foreground/60">Loading order report…</div>}>
      <OrderReportsClient />
    </Suspense>
  );
}
