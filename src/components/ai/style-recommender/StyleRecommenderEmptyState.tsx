export function StyleRecommenderEmptyState() {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[14px] border border-dashed border-[#F2E4E8] bg-[#FFFBFC] px-4 py-8 text-center">
      <span className="text-3xl" aria-hidden="true">
        ✨
      </span>
      <h3 className="mt-3 font-display text-base font-bold text-primary">
        Choose your style preferences
      </h3>
      <p className="mt-1 text-xs text-foreground/60">Press</p>
      <p className="mt-1 inline-flex items-center gap-1 rounded-full border border-primary/20 bg-white px-3 py-1 text-xs font-semibold text-primary">
        <span aria-hidden="true">✨</span>
        Find My Perfect Blouse
      </p>
      <p className="mt-3 max-w-xs text-xs leading-relaxed text-foreground/55">
        We&apos;ll recommend products matched to your style and budget.
      </p>
    </div>
  );
}
