import { Sparkles } from "lucide-react";

export function StyleRecommenderHero({ storeName }: { storeName: string }) {
  return (
    <header className="rounded-[14px] border border-[#F3E5E8] bg-gradient-to-r from-white to-[#FFFBFC] px-3 py-3 sm:px-4">
      <div className="flex items-start gap-2.5">
        <span
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg"
          aria-hidden="true"
        >
          ✨
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-secondary">
            Powered by {storeName} Smart Styling
          </p>
          <h1 className="mt-0.5 font-display text-xl font-bold text-primary sm:text-2xl">
            AI Style Recommender
          </h1>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-foreground/65 sm:text-sm">
            Discover blouse styles perfectly suited for your occasion, fashion preference, and
            budget.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/15 bg-white px-2 py-0.5 text-[10px] font-medium text-primary">
              <Sparkles className="h-3 w-3 text-secondary" aria-hidden="true" />
              Personalized Picks
            </span>
            <span className="rounded-full border border-[#F3E5E8] bg-white px-2 py-0.5 text-[10px] text-foreground/65">
              Budget Smart
            </span>
            <span className="rounded-full border border-[#F3E5E8] bg-white px-2 py-0.5 text-[10px] text-foreground/65">
              Occasion Ready
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
