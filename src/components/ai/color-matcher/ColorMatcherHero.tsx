import { Sparkles } from "lucide-react";

const TRUST_BADGES = ["Photo-Based Analysis", "Color Guidance", "Style Tips"] as const;

type ColorMatcherHeroProps = {
  onOpenGuide: () => void;
};

export function ColorMatcherHero({ onOpenGuide }: ColorMatcherHeroProps) {
  return (
    <header className="rounded-[14px] border border-[#F3E5E8] bg-gradient-to-r from-white to-[#FFFBFC] px-3 py-3 sm:px-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/15 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="h-3 w-3 text-secondary" aria-hidden="true" />
              Fashion Point AI
            </span>
            {TRUST_BADGES.map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-[#F3E5E8] bg-white px-2 py-0.5 text-[10px] text-foreground/65"
              >
                {badge}
              </span>
            ))}
          </div>
          <h1 className="mt-1.5 font-display text-xl font-bold text-primary sm:text-2xl">
            Saree Color Matcher
          </h1>
          <p className="mt-0.5 max-w-3xl text-xs leading-snug text-foreground/65 sm:text-sm">
            Suggested blouse colors based on detected saree colors. Choose a complementary shade
            with confidence.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenGuide}
          className="shrink-0 self-start text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:self-center"
        >
          Upload guide
        </button>
      </div>
    </header>
  );
}
