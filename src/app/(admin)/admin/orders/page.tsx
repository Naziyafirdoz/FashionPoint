import { Suspense } from "react";
import { AdminOrdersClient } from "@/components/admin/orders/AdminOrdersClient";
import { getStoreInformation } from "@/lib/settings/store-information";

export default async function AdminOrdersPage() {
  const { storeName } = await getStoreInformation();
  return (
    <Suspense fallback={<p className="p-6 text-sm text-foreground/60">Loading orders…</p>}>
      <AdminOrdersClient storeName={storeName} />
    </Suspense>
  );
}
