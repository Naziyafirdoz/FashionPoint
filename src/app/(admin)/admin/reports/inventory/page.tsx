import { Suspense } from "react";
import { InventoryReportsClient } from "@/components/admin/reports/InventoryReportsClient";

export default function InventoryReportsPage() {
  return (
    <Suspense fallback={<div className="bg-blush/30 p-6 text-sm text-foreground/60">Loading inventory report…</div>}>
      <InventoryReportsClient />
    </Suspense>
  );
}
