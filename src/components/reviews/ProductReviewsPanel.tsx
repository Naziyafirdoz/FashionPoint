"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RatingBreakdown as RatingBreakdownChart } from "@/components/reviews/RatingBreakdown";
import { ReviewFormModal } from "@/components/reviews/ReviewFormModal";
import { ReviewStars } from "@/components/reviews/ReviewStars";
import { VerifiedPurchaseBadge } from "@/components/reviews/VerifiedPurchaseBadge";
import { sortStoreReviews } from "@/lib/reviews/sort-reviews";
import type {
  ProductReviewSummary,
  RatingBreakdown,
  ReviewSortOption,
  StoreReview,
  UserReviewPreview
} from "@/lib/reviews/types";

const EMPTY_BREAKDOWN: RatingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

type ProductReviewsPanelProps = {
  productId: string;
  productName: string;
  onSummaryChange?: (summary: ProductReviewSummary) => void;
};

function formatReviewDate(iso: string) {
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

function ReviewPhoto({ src, alt }: { src: string; alt: string }) {
  if (src.startsWith("data:")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className="h-20 w-20 rounded-lg border object-cover" />
    );
  }

  return (
    <div className="relative h-20 w-20 overflow-hidden rounded-lg border">
      <Image src={src} alt={alt} fill className="object-cover" sizes="80px" />
    </div>
  );
}

export function ProductReviewsPanel({
  productId,
  productName,
  onSummaryChange
}: ProductReviewsPanelProps) {
  const [reviews, setReviews] = useState<StoreReview[]>([]);
  const [summary, setSummary] = useState<ProductReviewSummary>({ average_rating: 0, review_count: 0 });
  const [breakdown, setBreakdown] = useState<RatingBreakdown>(EMPTY_BREAKDOWN);
  const [userReview, setUserReview] = useState<UserReviewPreview | null>(null);
  const [sort, setSort] = useState<ReviewSortOption>("newest");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const router = useRouter();

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reviews?product_id=${encodeURIComponent(productId)}`, {
        cache: "no-store"
      });
      const data = await res.json();
      if (!res.ok) return;

      const nextSummary = data.summary ?? { average_rating: 0, review_count: 0 };
      setReviews(data.reviews ?? []);
      setSummary(nextSummary);
      setBreakdown(data.breakdown ?? EMPTY_BREAKDOWN);
      setUserReview(data.user_review ?? null);
      onSummaryChange?.(nextSummary);
    } finally {
      setLoading(false);
    }
  }, [productId, onSummaryChange]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const sortedReviews = useMemo(() => sortStoreReviews(reviews, sort), [reviews, sort]);

  const canWriteReview = !userReview;

  const openReviewForm = async () => {
    const res = await fetch("/api/reviews?mine=true");
    if (res.status === 401) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-foreground/60">
        Reviews from verified customers appear after moderation approval.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-blush/30 p-4">
        <div>
          <p className="text-sm text-foreground/60">Customer ratings</p>
          <div className="mt-1 flex items-center gap-3">
            <span className="text-2xl font-bold text-primary">
              {summary.review_count > 0 ? summary.average_rating.toFixed(1) : "—"}
            </span>
            {summary.review_count > 0 ? (
              <ReviewStars rating={Math.round(summary.average_rating)} size="md" showValue />
            ) : null}
          </div>
          <p className="mt-1 text-sm text-foreground/60">
            {summary.review_count > 0
              ? `${summary.review_count} review${summary.review_count === 1 ? "" : "s"}`
              : "No Reviews Yet"}
          </p>
        </div>

        {userReview ? (
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
            Review Submitted
          </span>
        ) : (
          <button type="button" onClick={openReviewForm} className="btn-primary">
            Write a Review
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-foreground/60">Loading reviews…</p>
      ) : summary.review_count > 0 ? (
        <RatingBreakdownChart summary={summary} breakdown={breakdown} />
      ) : null}

      {!loading && reviews.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-foreground">Customer reviews</p>
          <select
            className="rounded-lg border bg-white px-3 py-2 text-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value as ReviewSortOption)}
            aria-label="Sort reviews"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest">Highest Rating</option>
            <option value="lowest">Lowest Rating</option>
          </select>
        </div>
      ) : null}

      {loading ? null : sortedReviews.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 text-sm text-foreground/70">
          <p>No approved reviews yet.</p>
          {canWriteReview ? (
            <p className="mt-2">
              Be the first to share your experience, or{" "}
              <Link href="/login" className="text-primary underline">
                sign in
              </Link>{" "}
              to write a review.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          {sortedReviews.map((review) => (
            <article key={review.id} className="rounded-xl border bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{review.customer_name}</p>
                  <div className="mt-1">
                    <ReviewStars rating={review.rating} />
                  </div>
                </div>
                <p className="text-xs text-foreground/50">{formatReviewDate(review.created_at)}</p>
              </div>

              {review.is_verified_purchase ? (
                <div className="mt-2">
                  <VerifiedPurchaseBadge />
                </div>
              ) : null}

              {review.title ? <h3 className="mt-3 font-medium text-foreground">{review.title}</h3> : null}
              {review.body ? <p className="mt-2 text-sm text-foreground/80">{review.body}</p> : null}

              {review.size_purchased || review.color_purchased ? (
                <p className="mt-2 text-xs text-foreground/60">
                  {review.size_purchased ? `Size ${review.size_purchased}` : null}
                  {review.size_purchased && review.color_purchased ? " · " : null}
                  {review.color_purchased ?? null}
                </p>
              ) : null}

              {review.images.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {review.images.map((src, index) => (
                    <ReviewPhoto key={`${review.id}-${index}`} src={src} alt={`Review photo ${index + 1}`} />
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}

      <ReviewFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaults={{ productId, productName }}
        onSuccess={loadReviews}
      />
    </div>
  );
}
