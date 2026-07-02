import { Check, Sparkles } from "lucide-react";

type SizeFinderHeroProps = {
  hasSaved: boolean;
  lastSavedSize: string | null;
  lastSavedAt: string | null;
};

const TRUST_BADGES = ["AI Powered", "Accurate Fit", "Personalized Recommendation"] as const;

export function SizeFinderHero({
  hasSaved,
  lastSavedSize,
  lastSavedAt
}: SizeFinderHeroProps) {
  return (
    <header className="relative overflow-hidden rounded-[18px] border border-[#F3E5E8] bg-gradient-to-br from-white via-[#FFFBFC] to-[#FFF5F7] px-4 py-4 shadow-[0_4px_20px_rgba(122,13,43,0.05)] sm:px-5 sm:py-5">
      <div className="relative flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-white/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="h-3 w-3 text-secondary" aria-hidden="true" />
              Fashion Point AI
            </span>
            <ul className="flex flex-wrap gap-1.5">
              {TRUST_BADGES.map((badge) => (
                <li
                  key={badge}
                  className="inline-flex items-center gap-1 rounded-full border border-[#F3E5E8] bg-white px-2 py-0.5 text-[10px] font-medium text-foreground/70"
                >
                  <Check className="h-3 w-3 text-emerald-600" aria-hidden="true" />
                  {badge}
                </li>
              ))}
            </ul>
          </div>
          <h1 className="mt-2 font-display text-2xl font-bold text-primary sm:text-[1.75rem]">
            AI Size Finder
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-snug text-foreground/70">
            Find your perfect blouse size in seconds using your measurements.
          </p>
          {hasSaved ? (
            <p className="mt-1.5 text-xs text-foreground/60">Pre-filled from your saved measurements.</p>
          ) : null}
        </div>

        {lastSavedSize ? (
          <div className="shrink-0 rounded-xl border border-secondary/30 bg-gradient-to-br from-[#FFF8EC] to-white px-4 py-2.5 shadow-[0_2px_12px_rgba(184,134,11,0.1)]">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-secondary">Saved Size</p>
            <p className="font-display text-xl font-bold text-primary">{lastSavedSize}</p>
            {lastSavedAt ? (
              <p className="text-[10px] text-foreground/55">Updated {lastSavedAt}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}
