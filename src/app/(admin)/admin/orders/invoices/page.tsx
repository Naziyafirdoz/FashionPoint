import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";

export default function OrderInvoicesPage() {
  return (
    <>
      <AdminHeader title="Invoices" />
      <div className="space-y-4 p-6">
        <Link href="/admin/orders" className="text-sm text-primary underline">
          ← Back to orders
        </Link>
        <div className="rounded-xl border border-dashed border-accent/30 bg-blush/20 px-6 py-10 text-center">
          <p className="text-sm font-medium text-foreground">Invoices are not yet available.</p>
          <p className="mt-2 text-xs text-foreground/50">
            Invoice generation is not configured. Use Print Order on an order detail page for a
            printable summary.
          </p>
        </div>
      </div>
    </>
  );
}
