import { Suspense } from "react";
import { DeliveryOrdersClient } from "@/components/admin/delivery/DeliveryOrdersClient";

export default function DeliveryPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-gray-500">Loading delivery…</p>}>
      <DeliveryOrdersClient />
    </Suspense>
  );
}
