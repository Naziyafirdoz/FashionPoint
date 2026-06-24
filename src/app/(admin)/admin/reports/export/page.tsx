import { Suspense } from "react";
import { ExportCenterClient } from "@/components/admin/reports/ExportCenterClient";

export default function ExportCenterPage() {
  return (
    <Suspense fallback={<div className="bg-blush/30 p-6 text-sm text-foreground/60">Loading export center…</div>}>
      <ExportCenterClient />
    </Suspense>
  );
}
