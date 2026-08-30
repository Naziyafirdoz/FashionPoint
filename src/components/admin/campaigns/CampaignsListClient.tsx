"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminTablePagination } from "@/components/admin/AdminTablePagination";
import { CatalogTargetsPreviewModal } from "@/components/admin/targeting/CatalogTargetsPreviewModal";
import {
  isAdminCampaignStatus,
  type AdminCampaignDto,
  type AdminCampaignStatus
} from "@/lib/admin/campaigns";

const PAGE_SIZE = 10;

const STATUS_STYLES: Record<AdminCampaignStatus, string> = {
  active: "bg-green-100 text-green-800",
  scheduled: "bg-amber-100 text-amber-800",
  disabled: "bg-gray-100 text-gray-700",
  expired: "bg-red-100 text-red-800"
};

const STATUS_LABELS: Record<AdminCampaignStatus, string> = {
  active: "Active",
  scheduled: "Scheduled",
  disabled: "Disabled",
  expired: "Expired"
};

function formatScheduleInstant(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "—";
  }
}

function displayModeLabel(mode: AdminCampaignDto["displayMode"]) {
  return mode === "image_only" ? "Image only" : "Image + content";
}

function targetingLabel(campaign: AdminCampaignDto) {
  if (campaign.scope === "product") {
    const count = campaign.productIds.length;
    return `${count} product${count === 1 ? "" : "s"}`;
  }
  if (campaign.scope === "category") {
    const count = campaign.categoryIds.length;
    return `${count} categor${count === 1 ? "y" : "ies"}`;
  }
  return "—";
}

export function CampaignsListClient() {
  const [campaigns, setCampaigns] = useState<AdminCampaignDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AdminCampaignStatus>("all");
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewCampaign, setPreviewCampaign] = useState<AdminCampaignDto | null>(null);

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const url =
        statusFilter === "all"
          ? "/api/admin/campaigns"
          : `/api/admin/campaigns?status=${encodeURIComponent(statusFilter)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to load campaigns");
        setCampaigns([]);
        return;
      }
      setCampaigns(data.campaigns ?? []);
    } catch {
      toast.error("Failed to load campaigns");
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return campaigns;
    return campaigns.filter((campaign) => {
      return (
        campaign.name.toLowerCase().includes(q) ||
        (campaign.occasion ?? "").toLowerCase().includes(q)
      );
    });
  }, [campaigns, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDelete = async (campaign: AdminCampaignDto) => {
    const confirmed = window.confirm(`Delete ${campaign.name}? This cannot be undone.`);
    if (!confirmed) return;

    setDeletingId(campaign.id);
    try {
      const res = await fetch(`/api/admin/campaigns/${campaign.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Failed to delete campaign");
        return;
      }
      toast.success("Campaign deleted");
      await loadCampaigns();
    } catch {
      toast.error("Failed to delete campaign");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <AdminHeader title="Campaigns" />
      <div className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground/80">
            <span className="font-semibold text-foreground">{filtered.length}</span>
            {filtered.length !== campaigns.length
              ? ` of ${campaigns.length} campaigns`
              : ` campaign${filtered.length === 1 ? "" : "s"}`}
          </p>
          <Link href="/admin/campaigns/new" className="btn-primary text-center">
            ADD CAMPAIGN
          </Link>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="search"
            placeholder="Search by campaign name…"
            className="w-full rounded-lg border px-3 py-2 text-sm sm:max-w-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="w-full rounded-lg border px-3 py-2 text-sm sm:max-w-xs"
            value={statusFilter}
            onChange={(e) => {
              const value = e.target.value;
              setStatusFilter(value === "all" || isAdminCampaignStatus(value) ? value : "all");
            }}
            aria-label="Filter by status"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="scheduled">Scheduled</option>
            <option value="disabled">Disabled</option>
            <option value="expired">Expired</option>
          </select>
        </div>

        <div className="mt-6 overflow-x-auto rounded-xl border bg-white">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b bg-blush/50 text-left text-foreground/70">
                <th className="p-3 pr-4">Campaign name</th>
                <th className="p-3 pr-4">Occasion</th>
                <th className="p-3 pr-4">Display mode</th>
                <th className="p-3 pr-4">Targeting</th>
                <th className="p-3 pr-4">Status</th>
                <th className="p-3 pr-4">Start</th>
                <th className="p-3 pr-4">End</th>
                <th className="p-3 pr-4">Priority</th>
                <th className="p-3 pr-4">Enabled</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-foreground/60">
                    Loading campaigns…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-foreground/60">
                    {campaigns.length === 0
                      ? "No homepage campaigns yet. Add your first campaign."
                      : "No campaigns match your filters."}
                  </td>
                </tr>
              ) : (
                paginated.map((campaign) => (
                  <tr key={campaign.id} className="border-b border-accent/10">
                    <td className="p-3 pr-4 font-medium">{campaign.name}</td>
                    <td className="p-3 pr-4">{campaign.occasion ?? "—"}</td>
                    <td className="p-3 pr-4">{displayModeLabel(campaign.displayMode)}</td>
                    <td className="p-3 pr-4">
                      <div>{targetingLabel(campaign)}</div>
                      {campaign.scope ? (
                        <button
                          type="button"
                          className="mt-1 text-primary underline"
                          onClick={() => setPreviewCampaign(campaign)}
                        >
                          View targets →
                        </button>
                      ) : null}
                    </td>
                    <td className="p-3 pr-4">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[campaign.status]}`}
                      >
                        {STATUS_LABELS[campaign.status]}
                      </span>
                    </td>
                    <td className="p-3 pr-4 whitespace-nowrap">{formatScheduleInstant(campaign.startsAt)}</td>
                    <td className="p-3 pr-4 whitespace-nowrap">{formatScheduleInstant(campaign.endsAt)}</td>
                    <td className="p-3 pr-4">{campaign.priority}</td>
                    <td className="p-3 pr-4">{campaign.isEnabled ? "Yes" : "No"}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-3">
                        <Link
                          href={`/admin/campaigns/${campaign.id}/edit`}
                          className="text-primary underline"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          disabled={deletingId === campaign.id}
                          onClick={() => void handleDelete(campaign)}
                          className="text-red-600 underline disabled:opacity-50"
                        >
                          {deletingId === campaign.id ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4">
          <AdminTablePagination
            page={page}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>
      </div>
      <CatalogTargetsPreviewModal
        open={previewCampaign != null && previewCampaign.scope != null}
        target={
          previewCampaign?.scope
            ? {
                name: previewCampaign.name,
                scope: previewCampaign.scope,
                productIds: previewCampaign.productIds,
                categoryIds: previewCampaign.categoryIds
              }
            : null
        }
        onClose={() => setPreviewCampaign(null)}
        entityNoun="campaign"
      />
    </>
  );
}
