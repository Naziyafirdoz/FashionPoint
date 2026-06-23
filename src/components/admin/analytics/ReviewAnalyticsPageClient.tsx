"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { MessageSquare, Star, StarHalf } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminLiveStatus } from "@/components/admin/AdminLiveStatus";
import { EmptyState } from "@/components/admin/dashboard/EmptyState";
import { CHART_HEIGHT, KpiCard, PanelCard } from "@/components/admin/analytics/analytics-shared";
import type { AdminReviewRow } from "@/lib/admin/reviews";
import { computeReviewAnalytics } from "@/lib/admin/review-analytics";
import { useLiveTimestamp } from "@/lib/admin/use-live-timestamp";
import { createClient } from "@/lib/supabase/client";

const RATING_COLORS: Record<number, string> = {
  5: "#22c55e",
  4: "#84cc16",
  3: "#eab308",
  2: "#f97316",
  1: "#ef4444"
};

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
    </div>
  );
}

function ProductThumb({ image, name }: { image: string | null; name: string }) {
  return (
    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-white">
      {image ? (
        <Image src={image} alt="" fill className="object-cover" sizes="40px" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-foreground/30">
          <Star className="h-4 w-4" aria-hidden />
        </span>
      )}
    </div>
  );
}

async function fetchReviews(): Promise<{ reviews: AdminReviewRow[] }> {
  const res = await fetch("/api/admin/reviews", { cache: "no-store" });
  if (!res.ok) throw new Error("Unable to load reviews");
  const data = (await res.json()) as { reviews?: AdminReviewRow[] };
  return { reviews: data.reviews ?? [] };
}

export function ReviewAnalyticsPageClient() {
  const [reviews, setReviews] = useState<AdminReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeLive, setRealtimeLive] = useState(false);
  const { lastUpdated, touch } = useLiveTimestamp();

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    try {
      const data = await fetchReviews();
      setReviews(data.reviews);
      touch();
      setError(null);
    } catch {
      setError("Unable to load review analytics.");
    } finally {
      setLoading(false);
    }
  }, [touch]);

  useEffect(() => {
    void load(true);
  }, [load]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-review-analytics")
      .on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, () => {
        void load(false);
      })
      .subscribe((status) => {
        setRealtimeLive(status === "SUBSCRIBED");
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  const analytics = useMemo(() => computeReviewAnalytics(reviews), [reviews]);
  const hasReviews = analytics.overview.totalReviews > 0;

  return (
    <>
      <AdminHeader
        title="Review Analytics"
        action={<AdminLiveStatus lastUpdated={lastUpdated} live={realtimeLive} />}
      />

      <div className="space-y-4 bg-blush/30 p-4 sm:p-6">
        {loading ? (
          <p className="text-sm text-foreground/60">Loading review analytics…</p>
        ) : error ? (
          <EmptyState icon={Star} title="Unable to load review analytics" description={error} />
        ) : !hasReviews ? (
          <EmptyState
            icon={Star}
            title="No reviews yet"
            description="Review analytics will appear once customers leave product reviews."
          />
        ) : (
          <div className="space-y-4">
            <div>
              <h2 className="font-display text-lg font-bold text-primary">Review Analytics</h2>
              <p className="text-xs text-foreground/55">Customer satisfaction from real review history</p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <KpiCard
                icon={MessageSquare}
                label="Total Reviews"
                value={String(analytics.overview.totalReviews)}
              />
              <KpiCard
                icon={StarHalf}
                label="Average Rating"
                value={
                  analytics.overview.averageRating > 0
                    ? `${analytics.overview.averageRating} / 5`
                    : "—"
                }
              />
            </div>

            {analytics.ratingDistribution.length > 0 ? (
              <PanelCard title="Rating Distribution" subtitle="Share of approved reviews by star rating">
                <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                  <BarChart
                    data={analytics.ratingDistribution}
                    layout="vertical"
                    margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0d8e4" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
                    <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} width={48} />
                    <Tooltip
                      formatter={(value: number, _name, item) => {
                        const row = item.payload as { count: number; percentage: number };
                        return [`${value}% (${row.count} reviews)`, "Share"];
                      }}
                    />
                    <Bar dataKey="percentage" radius={[0, 4, 4, 0]} maxBarSize={22}>
                      {analytics.ratingDistribution.map((entry) => (
                        <Cell key={entry.stars} fill={RATING_COLORS[entry.stars] ?? "#7b0d2b"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </PanelCard>
            ) : null}

            {analytics.recentReviews.length > 0 ? (
              <PanelCard title="Recent Reviews" subtitle="Latest customer feedback">
                <ul className="space-y-2">
                  {analytics.recentReviews.map((review) => (
                    <li
                      key={review.id}
                      className="flex items-start gap-2.5 rounded-lg border border-accent/10 bg-blush/15 px-2 py-2.5"
                    >
                      <ProductThumb image={review.productImage} name={review.productName} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground">{review.customerName}</p>
                          <p className="text-[11px] text-foreground/50">{review.dateLabel}</p>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-foreground/65">{review.productName}</p>
                        <div className="mt-1">
                          <RatingStars rating={review.rating} />
                        </div>
                        {review.title ? (
                          <p className="mt-1 text-sm text-foreground/80">{review.title}</p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </PanelCard>
            ) : null}

            {analytics.mostReviewedProducts.length > 0 ? (
              <PanelCard title="Most Reviewed Products" subtitle="Sorted by review count">
                <ul className="space-y-2">
                  {analytics.mostReviewedProducts.map((product, index) => (
                    <li
                      key={product.productId}
                      className="flex items-center gap-2.5 rounded-lg border border-accent/10 bg-blush/15 px-2 py-2"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[9px] font-bold text-foreground">
                        {index + 1}
                      </span>
                      <ProductThumb image={product.productImage} name={product.productName} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {product.productName}
                        </p>
                        <p className="text-[11px] text-foreground/55">
                          {product.reviewCount}{" "}
                          {product.reviewCount === 1 ? "review" : "reviews"}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </PanelCard>
            ) : null}
          </div>
        )}
      </div>
    </>
  );
}
