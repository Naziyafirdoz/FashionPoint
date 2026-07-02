import { Suspense } from "react";
import { AdminInventoryClient } from "@/components/admin/AdminInventoryClient";

export default function AdminInventoryPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-foreground/60">Loading inventory…</p>}>
      <AdminInventoryClient />
    </Suspense>
  );
}
