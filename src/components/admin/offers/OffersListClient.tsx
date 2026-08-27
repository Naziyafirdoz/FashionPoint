"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminTablePagination } from "@/components/admin/AdminTablePagination";
import { OfferTargetsPreviewModal } from "@/components/admin/offers/OfferTargetsPreviewModal";
import {
  isAdminOfferStatus,
  type AdminOfferDto,
  type AdminOfferStatus
} from "@/lib/admin/offers";

const PAGE_SIZE = 10;

const STATUS_STYLES: Record<AdminOfferStatus, string> = {
  active: "bg-green-100 text-green-800",
  scheduled: "bg-amber-100 text-amber-800",
  disabled: "bg-gray-100 text-gray-700",
  expired: "bg-red-100 text-red-800"
};

const STATUS_LABELS: Record<AdminOfferStatus, string> = {
  active: "Active",
  scheduled: "Scheduled",
  disabled: "Disabled",
  expired: "Expired"
};

function formatDiscount(offer: AdminOfferDto) {
  if (offer.discountType === "percentage") {
    return `${offer.discountValue}%`;
  }
  return `₹${Number(offer.discountValue).toLocaleString("en-IN")} OFF`;
}

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

function targetingLabel(offer: AdminOfferDto) {
  if (offer.scope === "product") {
    const count = offer.productIds.length;
    return `${count} product${count === 1 ? "" : "s"}`;
  }
  const count = offer.categoryIds.length;
  return `${count} categor${count === 1 ? "y" : "ies"}`;
}

export function OffersListClient() {
  const [offers, setOffers] = useState<AdminOfferDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AdminOfferStatus>("all");
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewOffer, setPreviewOffer] = useState<AdminOfferDto | null>(null);

  const loadOffers = useCallback(async () => {
    setLoading(true);
    try {
      const url =
        statusFilter === "all"
          ? "/api/admin/offers"
          : `/api/admin/offers?status=${encodeURIComponent(statusFilter)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to load offers");
        setOffers([]);
        return;
      }
      setOffers(data.offers ?? []);
    } catch {
      toast.error("Failed to load offers");
      setOffers([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadOffers();
  }, [loadOffers]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return offers;
    return offers.filter((offer) => offer.name.toLowerCase().includes(q));
  }, [offers, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDelete = async (offer: AdminOfferDto) => {
    const confirmed = window.confirm(`Delete ${offer.name}? This cannot be undone.`);
    if (!confirmed) return;

    setDeletingId(offer.id);
    try {
      const res = await fetch(`/api/admin/offers/${offer.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Failed to delete offer");
        return;
      }
      toast.success("Offer deleted");
      await loadOffers();
    } catch {
      toast.error("Failed to delete offer");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <AdminHeader title="Festival Offers" />
      <div className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground/80">
            <span className="font-semibold text-foreground">{filtered.length}</span>
            {filtered.length !== offers.length
              ? ` of ${offers.length} offers`
              : ` offer${filtered.length === 1 ? "" : "s"}`}
          </p>
          <Link href="/admin/offers/new" className="btn-primary text-center">
            ADD OFFER
          </Link>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="search"
            placeholder="Search by offer name…"
            className="w-full rounded-lg border px-3 py-2 text-sm sm:max-w-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="w-full rounded-lg border px-3 py-2 text-sm sm:max-w-xs"
            value={statusFilter}
            onChange={(e) => {
              const value = e.target.value;
              setStatusFilter(value === "all" || isAdminOfferStatus(value) ? value : "all");
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
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="border-b bg-blush/50 text-left text-foreground/70">
                <th className="p-3 pr-4">Offer Name</th>
                <th className="p-3 pr-4">Discount</th>
                <th className="p-3 pr-4">Scope</th>
                <th className="p-3 pr-4">Schedule</th>
                <th className="p-3 pr-4">Enabled</th>
                <th className="p-3 pr-4">Status</th>
                <th className="p-3 pr-4">Targeting</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-foreground/60">
                    Loading offers…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-foreground/60">
                    {offers.length === 0
                      ? "No festival offers yet. Add your first offer."
                      : "No offers match your filters."}
                  </td>
                </tr>
              ) : (
                paginated.map((offer) => (
                  <tr key={offer.id} className="border-b border-accent/10">
                    <td className="p-3 pr-4 font-medium">{offer.name}</td>
                    <td className="p-3 pr-4">{formatDiscount(offer)}</td>
                    <td className="p-3 pr-4 capitalize">{offer.scope}</td>
                    <td className="p-3 pr-4 whitespace-nowrap">
                      <div>{formatScheduleInstant(offer.startsAt)}</div>
                      <div className="text-foreground/50">{formatScheduleInstant(offer.endsAt)}</div>
                    </td>
                    <td className="p-3 pr-4">{offer.isEnabled ? "Yes" : "No"}</td>
                    <td className="p-3 pr-4">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[offer.status]}`}
                      >
                        {STATUS_LABELS[offer.status]}
                      </span>
                    </td>
                    <td className="p-3 pr-4">
                      <div>{targetingLabel(offer)}</div>
                      <button
                        type="button"
                        className="mt-1 text-primary underline"
                        onClick={() => setPreviewOffer(offer)}
                      >
                        View targets →
                      </button>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-3">
                        <Link
                          href={`/admin/offers/${offer.id}/edit`}
                          className="text-primary underline"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          disabled={deletingId === offer.id}
                          onClick={() => void handleDelete(offer)}
                          className="text-red-600 underline disabled:opacity-50"
                        >
                          {deletingId === offer.id ? "Deleting…" : "Delete"}
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
      <OfferTargetsPreviewModal
        open={previewOffer != null}
        offer={previewOffer}
        onClose={() => setPreviewOffer(null)}
      />
    </>
  );
}
