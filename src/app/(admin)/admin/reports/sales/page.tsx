import { Suspense } from "react";
import { SalesReportsClient } from "@/components/admin/reports/SalesReportsClient";

export default function SalesReportsPage() {
  return (
    <Suspense fallback={<div className="bg-blush/30 p-6 text-sm text-foreground/60">Loading sales report…</div>}>
      <SalesReportsClient />
    </Suspense>
  );
}
