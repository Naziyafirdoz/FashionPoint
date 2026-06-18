import { Suspense } from "react";
import { AdminOrdersClient } from "@/components/admin/orders/AdminOrdersClient";

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-foreground/60">Loading orders…</p>}>
      <AdminOrdersClient />
    </Suspense>
  );
}
