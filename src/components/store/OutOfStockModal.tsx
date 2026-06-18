"use client";

import { useState } from "react";
import toast from "react-hot-toast";

type Props = {
  open: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
};

export function OutOfStockModal({ open, onClose, productId, productName }: Props) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", bust: "", waist: "", shoulder: "" });

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/stock-notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: productId,
        product_name: productName,
        ...form,
        bust: Number(form.bust) || undefined,
        waist: Number(form.waist) || undefined,
        shoulder: Number(form.shoulder) || undefined
      })
    });
    if (res.ok) {
      toast.success("We will notify you on WhatsApp!");
      onClose();
    } else toast.error("Could not submit request");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="font-bold text-primary">Notify When Available</h3>
        <p className="text-sm text-foreground/70">{productName}</p>
        <input required placeholder="Name" className="mt-4 w-full rounded-lg border px-3 py-2 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input required placeholder="Phone" className="mt-2 w-full rounded-lg border px-3 py-2 text-sm" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <div className="mt-2 grid grid-cols-3 gap-2">
          <input placeholder="Bust" className="rounded-lg border px-2 py-2 text-sm" value={form.bust} onChange={(e) => setForm({ ...form, bust: e.target.value })} />
          <input placeholder="Waist" className="rounded-lg border px-2 py-2 text-sm" value={form.waist} onChange={(e) => setForm({ ...form, waist: e.target.value })} />
          <input placeholder="Shoulder" className="rounded-lg border px-2 py-2 text-sm" value={form.shoulder} onChange={(e) => setForm({ ...form, shoulder: e.target.value })} />
        </div>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button type="submit" className="btn-primary flex-1">NOTIFY ME</button>
        </div>
      </form>
    </div>
  );
}
