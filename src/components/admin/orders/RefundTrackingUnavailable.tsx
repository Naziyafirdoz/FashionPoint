"use client";

export function RefundTrackingUnavailable() {
  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
      <h2 className="font-semibold text-amber-900">Refund Tracking</h2>
      <p className="mt-2 text-sm text-amber-800">
        Refund tracking unavailable. Database migration required.
      </p>
      <p className="mt-2 text-xs text-amber-700">
        Apply <code className="rounded bg-white/60 px-1">supabase/migrations/20260614_order_refund_fields.sql</code>{" "}
        and refresh the Supabase schema cache. See <code className="rounded bg-white/60 px-1">docs/REFUND_MIGRATION.md</code>.
      </p>
    </section>
  );
}
