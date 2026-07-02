"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RatingBreakdown as RatingBreakdownChart } from "@/components/reviews/RatingBreakdown";
import { ReviewFormModal } from "@/components/reviews/ReviewFormModal";
import { ReviewStars } from "@/components/reviews/ReviewStars";
import { VerifiedPurchaseBadge } from "@/components/reviews/VerifiedPurchaseBadge";
import {
  resolveReviewEligibility,
  reviewEligibilityMessage
} from "@/lib/reviews/resolve-review-eligibility";
import { sortStoreReviews } from "@/lib/reviews/sort-reviews";
import { useReviewRealtimeSync } from "@/lib/reviews/use-review-realtime-sync";
import { createClient } from "@/lib/supabase/client";
import type {
  ProductReviewSummary,
  RatingBreakdown,
  ReviewSortOption,
  StoreReview,
  UserReviewPreview
} from "@/lib/reviews/types";
import type { Order } from "@/types";

const EMPTY_BREAKDOWN: RatingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
const REVIEWS_PER_PAGE = 5;

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
      <img
        src={src}
        alt={alt}
        className="h-20 w-20 rounded-xl border border-[#F3E5E8] object-cover"
      />
    );
  }

  return (
    <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-[#F3E5E8]">
      <Image src={src} alt={alt} fill className="object-cover" sizes="80px" />
    </div>
  );
}

export function ProductReviewsPanel({
  productId,
  productName,
  onSummaryChange
}: ProductReviewsPanelProps) {
  const pathname = usePathname();
  const [reviews, setReviews] = useState<StoreReview[]>([]);
  const [summary, setSummary] = useState<ProductReviewSummary>({ average_rating: 0, review_count: 0 });
  const [breakdown, setBreakdown] = useState<RatingBreakdown>(EMPTY_BREAKDOWN);
  const [userReviews, setUserReviews] = useState<UserReviewPreview[]>([]);
  const [sort, setSort] = useState<ReviewSortOption>("newest");
  const [visibleCount, setVisibleCount] = useState(REVIEWS_PER_PAGE);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null | undefined>(undefined);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [ordersLoaded, setOrdersLoaded] = useState(false);

  const loadReviews = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
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
      setUserReviews(data.user_reviews ?? []);
      setVisibleCount(REVIEWS_PER_PAGE);
      onSummaryChange?.(nextSummary);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [productId, onSummaryChange]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  useReviewRealtimeSync(() => {
    void loadReviews(true);
  }, { productId });

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!cancelled) setAuthUserId(user?.id ?? null);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) setAuthUserId(session?.user?.id ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (authUserId === undefined) return;

    if (!authUserId) {
      setOrders(null);
      setOrdersLoaded(true);
      return;
    }

    let cancelled = false;
    setOrdersLoaded(false);

    void (async () => {
      try {
        const res = await fetch("/api/orders", { cache: "no-store", credentials: "include" });
        if (!res.ok) {
          if (!cancelled) {
            setOrders([]);
            setOrdersLoaded(true);
          }
          return;
        }

        const data = (await res.json()) as { orders?: Order[] };
        if (!cancelled) {
          setOrders(data.orders ?? []);
          setOrdersLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setOrders([]);
          setOrdersLoaded(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authUserId]);

  const sortedReviews = useMemo(() => sortStoreReviews(reviews, sort), [reviews, sort]);
  const visibleReviews = sortedReviews.slice(0, visibleCount);
  const hasMore = visibleCount < sortedReviews.length;

  const eligibility = useMemo(
    () =>
      resolveReviewEligibility({
        isLoggedIn: Boolean(authUserId),
        authResolved: authUserId !== undefined,
        userReviews,
        productId,
        orders,
        ordersLoaded
      }),
    [authUserId, userReviews, productId, orders, ordersLoaded]
  );

  const eligibilityMessage = reviewEligibilityMessage(eligibility);
  const loginHref = `/login?redirect=${encodeURIComponent(pathname)}`;

  const reviewDefaults =
    eligibility.kind === "can_write"
      ? {
          productId,
          productName,
          orderId: eligibility.orderId,
          sizePurchased: eligibility.sizePurchased,
          colorPurchased: eligibility.colorPurchased
        }
      : { productId, productName };

  return (
    <div className="max-w-4xl space-y-5">
      <p className="text-sm leading-relaxed text-[#888888]">
        Reviews from verified customers appear after moderation approval.
      </p>

      <div className="rounded-[15px] border border-[#EDE0E4] bg-[#FFFBFC] p-4 shadow-[0_2px_12px_rgba(122,13,43,0.05)] sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-primary">
              Customer Ratings
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="text-4xl font-bold leading-none text-primary">
                {summary.review_count > 0 ? summary.average_rating.toFixed(1) : "—"}
              </span>
              {summary.review_count > 0 ? (
                <ReviewStars rating={Math.round(summary.average_rating)} size="lg" />
              ) : null}
            </div>
            <p className="mt-2 text-sm text-[#888888]">
              {summary.review_count > 0
                ? `${summary.review_count} review${summary.review_count === 1 ? "" : "s"}`
                : "No reviews yet"}
            </p>
          </div>

          {eligibility.kind === "can_write" ? (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="btn-primary rounded-full px-5 py-2.5 text-[14px] font-semibold tracking-wide shadow-[0_4px_14px_rgba(123,13,43,0.2)] transition hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(123,13,43,0.28)]"
            >
              Write a Review
            </button>
          ) : eligibilityMessage ? (
            <p className="max-w-xs text-sm leading-relaxed text-[#666666]">
              {eligibility.kind === "not_logged_in" ? (
                <>
                  Sign in to view your purchase eligibility.{" "}
                  <Link href={loginHref} className="font-semibold text-primary hover:underline">
                    Sign in
                  </Link>
                </>
              ) : (
                eligibilityMessage
              )}
            </p>
          ) : null}
        </div>

        {!loading && summary.review_count > 0 ? (
          <div className="mt-5 border-t border-[#F3E5E8] pt-5">
            <RatingBreakdownChart summary={summary} breakdown={breakdown} />
          </div>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm text-[#888888]">Loading reviews…</p>
      ) : null}

      {!loading && reviews.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[15px] font-semibold text-[#2A2A2A]">Customer reviews</p>
          <select
            className="rounded-full border border-[#EDE0E4] bg-white px-4 py-2 text-sm font-medium text-[#4A4A4A] shadow-[0_2px_8px_rgba(122,13,43,0.04)] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as ReviewSortOption);
              setVisibleCount(REVIEWS_PER_PAGE);
            }}
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
        <div className="rounded-[15px] border border-dashed border-[#E8D4DA] bg-[#FFFBFC] px-4 py-5 text-center sm:px-6">
          <p className="text-[15px] font-medium text-[#2A2A2A]">No approved reviews yet</p>
          <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-[#888888]">
            {eligibility.kind === "can_write"
              ? "Be the first to share your experience with this product."
              : eligibility.kind === "not_logged_in"
                ? "Sign in to check whether you can leave a review."
                : eligibilityMessage ?? "Check back once customers start sharing feedback."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleReviews.map((review) => (
            <article
              key={review.id}
              className="rounded-[15px] border border-[#EDE0E4] bg-white p-4 shadow-[0_2px_10px_rgba(122,13,43,0.04)] transition-shadow duration-300 hover:shadow-[0_6px_18px_rgba(122,13,43,0.08)] sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[#2A2A2A]">{review.customer_name}</p>
                  <div className="mt-1.5">
                    <ReviewStars rating={review.rating} size="md" />
                  </div>
                </div>
                <p className="text-xs text-[#999999]">{formatReviewDate(review.created_at)}</p>
              </div>

              {review.is_verified_purchase ? (
                <div className="mt-2.5">
                  <VerifiedPurchaseBadge />
                </div>
              ) : null}

              {review.title ? (
                <h3 className="mt-3 text-base font-semibold text-[#2A2A2A]">{review.title}</h3>
              ) : null}
              {review.body ? (
                <p className="mt-2 text-[15px] leading-[1.75] text-[#4A4A4A]">{review.body}</p>
              ) : null}

              {review.size_purchased || review.color_purchased ? (
                <p className="mt-3 text-xs text-[#888888]">
                  {review.size_purchased ? `Purchased size: ${review.size_purchased}` : null}
                  {review.size_purchased && review.color_purchased ? " · " : null}
                  {review.color_purchased ? `Color: ${review.color_purchased}` : null}
                </p>
              ) : null}

              {review.images.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {review.images.map((src, index) => (
                    <ReviewPhoto key={`${review.id}-${index}`} src={src} alt={`Review photo ${index + 1}`} />
                  ))}
                </div>
              ) : null}
            </article>
          ))}

          {hasMore ? (
            <button
              type="button"
              onClick={() => setVisibleCount((current) => current + REVIEWS_PER_PAGE)}
              className="w-full rounded-full border border-primary/30 bg-white py-3 text-sm font-semibold text-primary transition hover:border-primary hover:bg-[#FFF5F7]"
            >
              Load more reviews
            </button>
          ) : null}
        </div>
      )}

      <ReviewFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaults={reviewDefaults}
        onSuccess={() => loadReviews()}
      />
    </div>
  );
}
