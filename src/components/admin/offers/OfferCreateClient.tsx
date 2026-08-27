"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { OfferForm, type OfferUpsertPayload } from "@/components/admin/offers/OfferForm";

export function OfferCreateClient() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (payload: OfferUpsertPayload) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to create offer");
        return;
      }
      toast.success("Offer created");
      router.push("/admin/offers");
    } catch {
      toast.error("Failed to create offer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AdminHeader title="Add Offer" />
      <div className="p-6">
        <OfferForm mode="create" saving={saving} onSubmit={handleSubmit} />
      </div>
    </>
  );
}
