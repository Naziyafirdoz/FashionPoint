"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";
import toast from "react-hot-toast";
import { AdminReviewPhotos } from "@/components/admin/AdminReviewPhotos";
import { VerifiedPurchaseBadge } from "@/components/reviews/VerifiedPurchaseBadge";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminProductThumbnail } from "@/components/admin/AdminProductThumbnail";
import { AdminTablePagination } from "@/components/admin/AdminTablePagination";
import { StatsCard } from "@/components/admin/StatsCard";
import {
  filterAdminReviews,
  getAdminReviewsSummary,
  type AdminReviewRow,
  type AdminReviewsSummary,
  type ReviewStatus
} from "@/lib/admin/reviews";

const STATUS_STYLES: Record<ReviewStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800"
};

const EMPTY_SUMMARY: AdminReviewsSummary = {
  total_reviews: 0,
  pending_reviews: 0,
  approved_reviews: 0,
  rejected_reviews: 0,
  average_rating: 0
};

const PAGE_SIZE = 10;

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  } catch {
    return "—";
  }
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={`h-3.5 w-3.5 ${
            index < rating ? "fill-amber-400 text-amber-400" : "text-foreground/20"
          }`}
        />
      ))}
      <span className="ml-1 text-xs text-foreground/60">{rating}/5</span>
    </div>
  );
}

export function AdminReviewsClient() {
  const [reviews, setReviews] = useState<AdminReviewRow[]>([]);
  const [summary, setSummary] = useState<AdminReviewsSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ReviewStatus>("all");
  const [ratingFilter, setRatingFilter] = useState<"all" | "1" | "2" | "3" | "4" | "5">("all");
  const [productFilter, setProductFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [actionId, setActionId] = useState<string | null>(null);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/reviews");
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to load reviews");
        setReviews([]);
        setSummary(EMPTY_SUMMARY);
        return;
      }
      setReviews(data.reviews ?? []);
      setSummary(data.summary ?? EMPTY_SUMMARY);
    } catch {
      toast.error("Failed to load reviews");
      setReviews([]);
      setSummary(EMPTY_SUMMARY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, ratingFilter, productFilter, customerFilter]);

  const productOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const review of reviews) {
      if (review.product_id) map.set(review.product_id, review.product_name);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [reviews]);

  const customerOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const review of reviews) {
      if (review.user_id) map.set(review.user_id, review.customer_name);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [reviews]);

  const filtered = useMemo(
    () =>
      filterAdminReviews(
        reviews,
        search,
        statusFilter,
        ratingFilter,
        productFilter,
        customerFilter
      ),
    [reviews, search, statusFilter, ratingFilter, productFilter, customerFilter]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const updateStatus = async (id: string, status: ReviewStatus) => {
    setActionId(id);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to update review");
        return;
      }
      setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      setSummary(getAdminReviewsSummary(
        reviews.map((r) => (r.id === id ? { ...r, status } : r))
      ));
      toast.success(`Review ${status}`);
    } catch {
      toast.error("Failed to update review");
    } finally {
      setActionId(null);
    }
  };

  const deleteReview = async (id: string) => {
    if (!window.confirm("Delete this review permanently?")) return;

    setActionId(id);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to delete review");
        return;
      }
      const next = reviews.filter((r) => r.id !== id);
      setReviews(next);
      setSummary(getAdminReviewsSummary(next));
      toast.success("Review deleted");
    } catch {
      toast.error("Failed to delete review");
    } finally {
      setActionId(null);
    }
  };

  return (
    <>
      <AdminHeader title="Product Reviews" />
      <div className="space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatsCard label="Total Reviews" value={String(summary.total_reviews)} />
          <StatsCard label="Pending Reviews" value={String(summary.pending_reviews)} />
          <StatsCard label="Approved Reviews" value={String(summary.approved_reviews)} />
          <StatsCard label="Rejected Reviews" value={String(summary.rejected_reviews)} />
          <StatsCard label="Average Rating" value={summary.average_rating.toFixed(1)} />
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
          <input
            type="search"
            placeholder="Search product, customer, title, or review text…"
            className="min-w-[220px] flex-1 rounded-lg border px-3 py-2 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="rounded-lg border px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | ReviewStatus)}
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            className="rounded-lg border px-3 py-2 text-sm"
            value={ratingFilter}
            onChange={(e) =>
              setRatingFilter(e.target.value as "all" | "1" | "2" | "3" | "4" | "5")
            }
          >
            <option value="all">All ratings</option>
            <option value="5">5 stars</option>
            <option value="4">4 stars</option>
            <option value="3">3 stars</option>
            <option value="2">2 stars</option>
            <option value="1">1 star</option>
          </select>
          <select
            className="rounded-lg border px-3 py-2 text-sm"
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
          >
            <option value="all">All products</option>
            {productOptions.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border px-3 py-2 text-sm"
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
          >
            <option value="all">All customers</option>
            {customerOptions.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto rounded-xl border bg-white">
          {loading ? (
            <p className="p-6 text-sm text-foreground/60">Loading reviews…</p>
          ) : (
            <table className="w-full min-w-[1200px] text-sm">
              <thead>
                <tr className="border-b bg-blush/50 text-left text-foreground/70">
                  <th className="p-3">Product</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Rating</th>
                  <th className="p-3">Review</th>
                  <th className="p-3">Variant</th>
                  <th className="p-3">Photos</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-foreground/60">
                      {reviews.length === 0
                        ? "No reviews yet."
                        : "No reviews match your filters."}
                    </td>
                  </tr>
                ) : (
                  paginated.map((review) => {
                    const busy = actionId === review.id;
                    return (
                      <tr key={review.id} className="border-b border-accent/10 align-top">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <AdminProductThumbnail
                              src={review.product_image ?? undefined}
                              alt={review.product_name}
                            />
                            <span className="font-medium">{review.product_name}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="space-y-1">
                            <p>{review.customer_name}</p>
                            {review.is_verified_purchase ? <VerifiedPurchaseBadge /> : null}
                          </div>
                        </td>
                        <td className="p-3">
                          <RatingStars rating={review.rating} />
                        </td>
                        <td className="max-w-xs p-3">
                          {review.title && (
                            <p className="font-medium text-foreground">{review.title}</p>
                          )}
                          <p className="mt-1 line-clamp-3 text-foreground/80">
                            {review.body || "—"}
                          </p>
                        </td>
                        <td className="p-3 whitespace-nowrap text-foreground/80">
                          {review.size_purchased || review.color_purchased ? (
                            <>
                              {review.size_purchased && <span>Size {review.size_purchased}</span>}
                              {review.size_purchased && review.color_purchased && (
                                <span className="text-foreground/40"> · </span>
                              )}
                              {review.color_purchased && <span>{review.color_purchased}</span>}
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="p-3">
                          <AdminReviewPhotos images={review.images} />
                        </td>
                        <td className="p-3 whitespace-nowrap">{formatDate(review.created_at)}</td>
                        <td className="p-3">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[review.status]}`}
                          >
                            {review.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-2">
                            {review.status !== "approved" && (
                              <button
                                type="button"
                                className="text-green-700 underline disabled:opacity-40"
                                disabled={busy}
                                onClick={() => updateStatus(review.id, "approved")}
                              >
                                Approve
                              </button>
                            )}
                            {review.status !== "rejected" && (
                              <button
                                type="button"
                                className="text-amber-700 underline disabled:opacity-40"
                                disabled={busy}
                                onClick={() => updateStatus(review.id, "rejected")}
                              >
                                Reject
                              </button>
                            )}
                            <button
                              type="button"
                              className="text-red-600 underline disabled:opacity-40"
                              disabled={busy}
                              onClick={() => deleteReview(review.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        <AdminTablePagination
          page={page}
          totalPages={totalPages}
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>
    </>
  );
}
