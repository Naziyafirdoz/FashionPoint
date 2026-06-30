import { Star } from "lucide-react";
import { ReviewStars } from "@/components/reviews/ReviewStars";
import type { ProductReviewSummary } from "@/lib/reviews/types";

type ProductCardRatingProps = {
  summary?: ProductReviewSummary | null;
  compact?: boolean;
  listing?: boolean;
};

export function ProductCardRating({
  summary,
  compact = false,
  listing = false
}: ProductCardRatingProps) {
  if (!summary || summary.review_count === 0) {
    if (compact) return null;
    return (
      <p className={`text-[13px] ${listing ? "text-[#666666]" : "text-foreground/50"}`}>
        No Reviews Yet
      </p>
    );
  }

  if (listing) {
    const roundedRating = Math.round(summary.average_rating);
    return (
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
        <div className="flex items-center gap-0.5" aria-label={`${summary.average_rating} out of 5 stars`}>
          {Array.from({ length: 5 }).map((_, index) => (
            <Star
              key={index}
              className={`h-3.5 w-3.5 ${
                index < roundedRating ? "fill-[#7B0D2B] text-[#7B0D2B]" : "text-[#E8D4DA]"
              }`}
            />
          ))}
        </div>
        <span className="text-[13px] text-[#666666]">({summary.review_count})</span>
      </div>
    );
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
