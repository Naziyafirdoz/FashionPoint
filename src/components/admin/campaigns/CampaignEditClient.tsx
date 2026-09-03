"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { CampaignForm, type CampaignUpsertPayload } from "@/components/admin/campaigns/CampaignForm";
import type { AdminCampaignDto } from "@/lib/admin/campaigns";

type CampaignEditClientProps = {
  campaignId: string;
};

export function CampaignEditClient({ campaignId }: CampaignEditClientProps) {
  const router = useRouter();
  const [campaign, setCampaign] = useState<AdminCampaignDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setNotFound(false);
      setLoadFailed(false);
      try {
        const res = await fetch(`/api/admin/campaigns/${campaignId}`);
        const data = await res.json();
        if (cancelled) return;
        if (res.status === 404) {
          setNotFound(true);
          setCampaign(null);
          return;
        }
        if (!res.ok) {
          toast.error(data.error ?? "Failed to load campaign");
          setLoadFailed(true);
          setCampaign(null);
          return;
        }
        setCampaign(data.campaign ?? null);
        if (!data.campaign) setNotFound(true);
      } catch {
        if (!cancelled) {
          toast.error("Failed to load campaign");
          setLoadFailed(true);
          setCampaign(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  const handleSubmit = async (payload: CampaignUpsertPayload) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to save campaign");
        return;
      }
      toast.success("Campaign updated");
      router.push("/admin/campaigns");
    } catch {
      toast.error("Failed to save campaign");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <AdminHeader title="Edit Campaign" />
        <p className="p-6 text-sm text-foreground/60">Loading campaign…</p>
      </>
    );
  }

  if (notFound) {
    return (
      <>
        <AdminHeader title="Edit Campaign" />
        <p className="p-6 text-sm text-red-600">
          Campaign not found.{" "}
          <Link href="/admin/campaigns" className="text-primary underline">
            Back to campaigns
          </Link>
        </p>
      </>
    );
  }

  if (loadFailed || !campaign) {
    return (
      <>
        <AdminHeader title="Edit Campaign" />
        <p className="p-6 text-sm text-red-600">
          Unable to load this campaign.{" "}
          <Link href="/admin/campaigns" className="text-primary underline">
            Back to campaigns
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <AdminHeader title="Edit Campaign" />
      <div className="p-6">
        <CampaignForm mode="edit" initial={campaign} saving={saving} onSubmit={handleSubmit} />
      </div>
    </>
  );
}
