"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { CampaignForm, type CampaignUpsertPayload } from "@/components/admin/campaigns/CampaignForm";

export function CampaignCreateClient() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (payload: CampaignUpsertPayload) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to create campaign");
        return;
      }
      toast.success("Campaign created");
      router.push("/admin/campaigns");
    } catch {
      toast.error("Failed to create campaign");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AdminHeader title="Add Campaign" />
      <div className="p-6">
        <CampaignForm mode="create" saving={saving} onSubmit={handleSubmit} />
      </div>
    </>
  );
}
