import Link from "next/link";
import { Bot } from "lucide-react";
import type { SizeMatchMode } from "@/lib/products/ai-size-shop-fallback";
import { buildCompatibleOversizeFallbackMessage } from "@/lib/products/ai-size-shop-fallback";

type ProductsAiSizeBannerProps = {
  recommendedSize: string;
  sizeMatchMode?: SizeMatchMode;
  onClearRecommendation: () => void;
};

function formatSizeDisplay(label: string) {
  const match = label.match(/^([^(]+)\(([^)]+)\)$/);
  if (match) return `${match[1]} (${match[2]})`;
  return label;
}

export function ProductsAiSizeBanner({
  recommendedSize,
  sizeMatchMode = "exact",
  onClearRecommendation
}: ProductsAiSizeBannerProps) {
  const isFallback = sizeMatchMode === "compatible_oversize";

  return (
    <section
      aria-label="AI size recommendation"
      className="rounded-[18px] border border-primary/15 bg-gradient-to-r from-[#FFF5F7] via-white to-[#FFF8EC] p-4 shadow-[0_4px_20px_rgba(123,13,43,0.06)] sm:p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFF0F3] text-primary">
            <Bot className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">AI Size Recommendation</p>
            <p className="mt-1 text-sm text-foreground/70">
              {isFallback
                ? buildCompatibleOversizeFallbackMessage(recommendedSize)
                : "Showing blouses recommended for your measurements."}
            </p>
            <p className="mt-2 text-sm text-foreground/80">
              Recommended Size:{" "}
              <span className="font-display text-lg font-bold text-primary">
                {formatSizeDisplay(recommendedSize)}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 sm:shrink-0">
          <Link
            href="/ai-features/size-finder"
            className="inline-flex h-10 items-center justify-center rounded-full border border-primary/30 bg-white px-4 text-sm font-semibold text-primary transition hover:bg-[#FFF5F7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Change Size
          </Link>
          <button
            type="button"
            onClick={onClearRecommendation}
            className="inline-flex h-10 items-center justify-center rounded-full border border-[#F3E5E8] bg-white px-4 text-sm font-semibold text-foreground/75 transition hover:border-primary/20 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Clear Recommendation
          </button>
        </div>
      </div>
    </section>
  );
}
