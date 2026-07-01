"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminProductThumbnail } from "@/components/admin/AdminProductThumbnail";
import { BackInStockImagePreviewModal } from "@/components/admin/BackInStockImagePreviewModal";
import { AdminTablePagination } from "@/components/admin/AdminTablePagination";
import { StatsCard } from "@/components/admin/StatsCard";
import type {
  BackInStockRequestRow,
  BackInStockRequestStatus,
  BackInStockRequestsSummary
} from "@/lib/admin/back-in-stock-requests";

const PAGE_SIZE = 15;

const STATUS_STYLES: Record<BackInStockRequestStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  sent: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-600"
};

const STATUS_LABELS: Record<BackInStockRequestStatus, string> = {
  pending: "Pending",
  sent: "Sent",
  cancelled: "Cancelled"
};

const EMPTY_SUMMARY: BackInStockRequestsSummary = {
  total: 0,
  pending: 0,
  sent: 0,
  cancelled: 0
};

function formatDate(iso: string) {
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

export function AdminBackInStockRequestsClient() {
  const [rows, setRows] = useState<BackInStockRequestRow[]>([]);
  const [summary, setSummary] = useState<BackInStockRequestsSummary>(EMPTY_SUMMARY);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | BackInStockRequestStatus>("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "product" | "customer">("newest");
  const [page, setPage] = useState(1);
  const [actionId, setActionId] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<{ src: string; alt: string } | null>(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        sort,
        status: statusFilter
      });
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/admin/back-in-stock-requests?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to load requests");
        setRows([]);
        setSummary(EMPTY_SUMMARY);
        setTotal(0);
        return;
      }
      setRows(data.rows ?? []);
      setSummary(data.summary ?? EMPTY_SUMMARY);
      setTotal(data.total ?? 0);
    } catch {
      toast.error("Failed to load requests");
      setRows([]);
      setSummary(EMPTY_SUMMARY);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, search, sort, statusFilter]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, sort]);

  const pageCount = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  const updateStatus = async (id: string, status: BackInStockRequestStatus) => {
    setActionId(id);
    try {
      const res = await fetch("/api/admin/back-in-stock-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not update request");
        return;
      }
      toast.success(status === "cancelled" ? "Request cancelled" : "Request updated");
      await loadRequests();
    } catch {
      toast.error("Could not update request");
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminHeader title="Back In Stock Requests" />

      <BackInStockImagePreviewModal
        open={imagePreview !== null}
        src={imagePreview?.src ?? ""}
        alt={imagePreview?.alt ?? "Product"}
        onClose={() => setImagePreview(null)}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Total Requests" value={String(summary.total)} />
        <StatsCard label="Pending" value={String(summary.pending)} />
        <StatsCard label="Notified" value={String(summary.sent)} />
        <StatsCard label="Cancelled" value={String(summary.cancelled)} />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Search</span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Product, customer, or email"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Status</span>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as "all" | BackInStockRequestStatus)
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="sent">Sent</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Sort by</span>
              <select
                value={sort}
                onChange={(e) =>
                  setSort(e.target.value as "newest" | "oldest" | "product" | "customer")
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="product">Product name</option>
                <option value="customer">Customer name</option>
              </select>
            </label>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
                <th className="px-3 py-3 font-semibold">Image</th>
                <th className="px-3 py-3 font-semibold">Product</th>
                <th className="px-3 py-3 font-semibold">Customer</th>
                <th className="px-3 py-3 font-semibold">Email</th>
                <th className="px-3 py-3 font-semibold">Requested On</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 font-semibold">Current Stock</th>
                <th className="px-3 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-gray-500">
                    Loading requests…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-gray-500">
                    No back-in-stock requests found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                    <td className="px-3 py-3">
                      {row.product_image ? (
                        <button
                          type="button"
                          onClick={() =>
                            setImagePreview({
                              src: row.product_image!,
                              alt: row.product_name ?? "Product"
                            })
                          }
                          className="cursor-zoom-in rounded-lg transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                          aria-label={`Preview ${row.product_name ?? "product"} image`}
                        >
                          <AdminProductThumbnail
                            src={row.product_image}
                            alt={row.product_name ?? "Product"}
                          />
                        </button>
                      ) : (
                        <AdminProductThumbnail src={undefined} alt="No image available" />
                      )}
                    </td>
                    <td className="px-3 py-3 font-medium text-gray-900">
                      {row.product_name ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-gray-700">{row.customer_name}</td>
                    <td className="px-3 py-3 text-gray-600">{row.customer_email}</td>
                    <td className="px-3 py-3 text-gray-600">{formatDate(row.created_at)}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[row.status]}`}
                      >
                        {STATUS_LABELS[row.status]}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-700">{row.current_stock}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href="/admin/inventory"
                          className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Inventory
                        </Link>
                        {row.product_id ? (
                          <Link
                            href={`/admin/products/${row.product_id}/edit`}
                            className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Edit
                          </Link>
                        ) : null}
                        {row.status === "pending" ? (
                          <button
                            type="button"
                            disabled={actionId === row.id}
                            onClick={() => updateStatus(row.id, "cancelled")}
                            className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <AdminTablePagination
          page={page}
          totalPages={pageCount}
          onPageChange={setPage}
          totalItems={total}
          pageSize={PAGE_SIZE}
        />
      </div>
    </div>
  );
}
