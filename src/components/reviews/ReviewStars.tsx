import { Star } from "lucide-react";

type ReviewStarsProps = {
  rating: number;
  size?: "sm" | "md";
  showValue?: boolean;
};

export function ReviewStars({ rating, size = "sm", showValue = false }: ReviewStarsProps) {
  const iconClass = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";

  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={`${iconClass} ${
            index < rating ? "fill-secondary text-secondary" : "text-foreground/20"
          }`}
        />
      ))}
      {showValue ? <span className="ml-1 text-sm text-foreground/70">{rating.toFixed(1)}</span> : null}
    </div>
  );
}

type ReviewStarInputProps = {
  value: number;
  onChange: (rating: number) => void;
};

export function ReviewStarInput({ value, onChange }: ReviewStarInputProps) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => {
        const starValue = index + 1;
        return (
          <button
            key={starValue}
            type="button"
            aria-label={`Rate ${starValue} stars`}
            onClick={() => onChange(starValue)}
            className="rounded p-0.5 transition hover:scale-105"
          >
            <Star
              className={`h-6 w-6 ${
                starValue <= value ? "fill-secondary text-secondary" : "text-foreground/25"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
