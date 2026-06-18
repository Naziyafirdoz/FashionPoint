import type { ProductReviewSummary, RatingBreakdown as RatingBreakdownType } from "@/lib/reviews/types";
import { ReviewStars } from "@/components/reviews/ReviewStars";

type RatingBreakdownProps = {
  summary: ProductReviewSummary;
  breakdown: RatingBreakdownType;
};

const STAR_LEVELS = [5, 4, 3, 2, 1] as const;

export function RatingBreakdown({ summary, breakdown }: RatingBreakdownProps) {
  const maxCount = Math.max(...STAR_LEVELS.map((level) => breakdown[level]), 1);

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <p className="text-3xl font-bold text-primary">{summary.average_rating.toFixed(1)}</p>
          <ReviewStars rating={Math.round(summary.average_rating)} size="md" />
          <p className="mt-1 text-sm text-foreground/60">
            {summary.review_count} Review{summary.review_count === 1 ? "" : "s"}
          </p>
        </div>

        <div className="min-w-[220px] flex-1 space-y-2">
          {STAR_LEVELS.map((level) => {
            const count = breakdown[level];
            const width = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;

            return (
              <div key={level} className="flex items-center gap-2 text-xs">
                <span className="w-6 shrink-0 font-medium text-foreground/70">{level}★</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-blush/60">
                  <div
                    className="h-full rounded-full bg-secondary transition-all"
                    style={{ width: `${width}%` }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right text-foreground/60">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
