"use client";

import { useState } from "react";
import toast from "react-hot-toast";

type InternalNotesCardProps = {
  orderId: string;
  initialNotes?: string;
  onSaved?: (notes: string) => void;
};

export function InternalNotesCard({ orderId, initialNotes = "", onSaved }: InternalNotesCardProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internal_notes: notes })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to save notes");
        return;
      }
      onSaved?.(notes);
      toast.success("Internal notes saved");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 lg:col-span-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        Internal Notes
      </h2>
      <p className="mt-1 text-xs text-gray-500">Visible to admins only. Not shown to customers.</p>
      <textarea
        className="mt-3 min-h-[100px] w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        placeholder="Add internal notes about this order…"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Notes"}
        </button>
      </div>
    </section>
  );
}
