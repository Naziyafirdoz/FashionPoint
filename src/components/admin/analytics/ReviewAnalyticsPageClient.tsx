"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { CheckCircle2, MessageSquare, Star, StarHalf, TrendingUp } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminLiveStatus } from "@/components/admin/AdminLiveStatus";
import { EmptyState } from "@/components/admin/dashboard/EmptyState";
import {
  CHART_HEIGHT,
  KpiCard,
  PanelCard,
  StatCard
} from "@/components/admin/analytics/analytics-shared";
import type { AdminReviewRow } from "@/lib/admin/reviews";
import {
  computeReviewAnalytics,
  REVIEW_ANALYTICS_MIN_LOW_RATED,
  REVIEW_ANALYTICS_MIN_TOP_RATED,
  type ReviewAnalyticsSnapshot
} from "@/lib/admin/review-analytics";
import { useLiveTimestamp } from "@/lib/admin/use-live-timestamp";
import { createClient } from "@/lib/supabase/client";

const RATING_COLORS: Record<number, string> = {
  5: "#22c55e",
  4: "#84cc16",
  3: "#eab308",
  2: "#f97316",
  1: "#ef4444"
};

type TrendRange = "daily" | "weekly" | "monthly";

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
  const [trendRange, setTrendRange] = useState<TrendRange>("daily");
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

  const analytics: ReviewAnalyticsSnapshot = useMemo(
    () => computeReviewAnalytics(reviews),
    [reviews]
  );

  const trendData = useMemo(() => {
    if (trendRange === "weekly") return analytics.weeklyTrend;
    if (trendRange === "monthly") return analytics.monthlyTrend;
    return analytics.dailyTrend;
  }, [analytics, trendRange]);

  const hasReviews = analytics.overview.totalReviews > 0;
  const hasTrendData = trendData.length >= 2;

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

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
              <KpiCard
                icon={CheckCircle2}
                label="Verified Purchase Reviews"
                value={String(analytics.overview.verifiedPurchaseReviews)}
              />
              <KpiCard
                icon={TrendingUp}
                label="Reviews Today"
                value={String(analytics.overview.reviewsToday)}
              />
            </div>

            {analytics.ratingDistribution.length > 0 ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <PanelCard title="Rating Distribution" subtitle="Share of approved reviews by star rating">
                  <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                    <BarChart
                      data={analytics.ratingDistribution}
                      layout="vertical"
                      margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0d8e4" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
                      <YAxis
                        type="category"
                        dataKey="label"
                        tick={{ fontSize: 10 }}
                        width={48}
                      />
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

                <PanelCard title="Rating Breakdown" subtitle="Distribution by stars">
                  <div className="flex h-full flex-col items-center justify-center gap-4 sm:flex-row">
                    <div className="h-[11rem] w-full max-w-[11rem]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analytics.ratingDistribution}
                            dataKey="count"
                            nameKey="label"
                            cx="50%"
                            cy="50%"
                            innerRadius={36}
                            outerRadius={58}
                            paddingAngle={2}
                          >
                            {analytics.ratingDistribution.map((entry) => (
                              <Cell
                                key={entry.stars}
                                fill={RATING_COLORS[entry.stars] ?? "#9ca3af"}
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="min-w-0 flex-1 space-y-1.5">
                      {analytics.ratingDistribution.map((entry) => (
                        <li
                          key={entry.stars}
                          className="flex items-center justify-between gap-2 text-xs text-foreground/70"
                        >
                          <span className="flex min-w-0 items-center gap-1.5">
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{
                                backgroundColor: RATING_COLORS[entry.stars] ?? "#9ca3af"
                              }}
                            />
                            <span>{entry.label}</span>
                          </span>
                          <span className="font-semibold tabular-nums text-primary">
                            {entry.count} ({entry.percentage}%)
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </PanelCard>
              </div>
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
                          <p className="text-sm font-semibold text-foreground">
                            {review.customerName}
                          </p>
                          <p className="text-[11px] text-foreground/50">{review.dateLabel}</p>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-foreground/65">
                          {review.productName}
                        </p>
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

            <div className="grid gap-4 lg:grid-cols-2">
              {analytics.topRatedProducts.length > 0 ? (
                <PanelCard
                  title="Top Rated Products"
                  subtitle={`Minimum ${REVIEW_ANALYTICS_MIN_TOP_RATED} approved reviews`}
                >
                  <ul className="space-y-2">
                    {analytics.topRatedProducts.map((product) => (
                      <li
                        key={product.productId}
                        className="flex items-center gap-2.5 rounded-lg border border-accent/10 bg-blush/15 px-2 py-2"
                      >
                        <ProductThumb image={product.productImage} name={product.productName} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {product.productName}
                          </p>
                          <p className="text-[11px] text-foreground/55">
                            {product.averageRating} avg · {product.reviewCount}{" "}
                            {product.reviewCount === 1 ? "review" : "reviews"}
                          </p>
                        </div>
                        <RatingStars rating={Math.round(product.averageRating)} />
                      </li>
                    ))}
                  </ul>
                </PanelCard>
              ) : null}

              {analytics.lowRatedProducts.length > 0 ? (
                <PanelCard
                  title="Low Rated Products"
                  subtitle={`Minimum ${REVIEW_ANALYTICS_MIN_LOW_RATED} approved reviews`}
                >
                  <ul className="space-y-2">
                    {analytics.lowRatedProducts.map((product) => (
                      <li
                        key={product.productId}
                        className="flex items-center gap-2.5 rounded-lg border border-accent/10 bg-blush/15 px-2 py-2"
                      >
                        <ProductThumb image={product.productImage} name={product.productName} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {product.productName}
                          </p>
                          <p className="text-[11px] text-foreground/55">
                            {product.averageRating} avg · {product.reviewCount}{" "}
                            {product.reviewCount === 1 ? "review" : "reviews"}
                          </p>
                        </div>
                        <RatingStars rating={Math.round(product.averageRating)} />
                      </li>
                    ))}
                  </ul>
                </PanelCard>
              ) : null}
            </div>

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

            {analytics.verifiedPurchase.total > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <StatCard
                  label="Verified Purchase Reviews"
                  value={String(analytics.verifiedPurchase.count)}
                />
                {analytics.verifiedPurchase.percent !== null ? (
                  <div className="rounded-xl border border-accent/20 bg-white p-4 shadow-card">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      Verified Purchase Share
                    </p>
                    <p className="mt-2 text-2xl font-bold text-primary">
                      {analytics.verifiedPurchase.percent}%
                    </p>
                    <p className="mt-1 text-xs text-foreground/60">
                      {analytics.verifiedPurchase.count} of {analytics.verifiedPurchase.total} total
                      reviews
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}

            {hasTrendData ? (
              <PanelCard
                title="Rating Trend"
                subtitle="Average rating over time (approved reviews)"
                action={
                  <select
                    aria-label="Rating trend range"
                    value={trendRange}
                    onChange={(e) => setTrendRange(e.target.value as TrendRange)}
                    className="h-8 rounded-lg border border-accent/30 bg-white px-2 text-xs text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                }
              >
                <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                  <AreaChart data={trendData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="reviewRatingGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#c9a227" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#c9a227" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0d8e4" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis domain={[1, 5]} tick={{ fontSize: 10 }} width={32} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const point = payload[0]?.payload as {
                          averageRating: number;
                          reviewCount: number;
                        };
                        return (
                          <div className="rounded-lg border bg-white px-3 py-2 text-xs shadow-md">
                            <p className="font-semibold text-primary">{label}</p>
                            <p className="mt-1 text-foreground/70">
                              Avg rating: {point.averageRating} / 5
                            </p>
                            <p className="text-foreground/70">
                              Reviews: {point.reviewCount}
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="averageRating"
                      stroke="#c9a227"
                      strokeWidth={2}
                      fill="url(#reviewRatingGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </PanelCard>
            ) : null}
          </div>
        )}
      </div>
    </>
  );
}
