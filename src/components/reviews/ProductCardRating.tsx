import { ReviewStars } from "@/components/reviews/ReviewStars";
import type { ProductReviewSummary } from "@/lib/reviews/types";

type ProductCardRatingProps = {
  summary?: ProductReviewSummary | null;
  compact?: boolean;
};

export function ProductCardRating({ summary, compact = false }: ProductCardRatingProps) {
  if (!summary || summary.review_count === 0) {
    if (compact) return null;
    return <p className="mt-1 text-xs text-foreground/50">No Reviews Yet</p>;
  }

  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 ${compact ? "" : "mt-1"}`}>
      <ReviewStars rating={Math.round(summary.average_rating)} />
      <span className="text-xs font-medium text-foreground/80">
        {summary.average_rating.toFixed(1)}
      </span>
      <span className="text-xs text-foreground/60">
        ({summary.review_count} Review{summary.review_count === 1 ? "" : "s"})
      </span>
    </div>
  );
}
