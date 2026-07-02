import type { StructuredStyleTips } from "@/lib/color-matcher-style-tips";

type ColorMatcherStyleTipsSectionProps = {
  tips: StructuredStyleTips;
};

export function ColorMatcherStyleTipsSection({ tips }: ColorMatcherStyleTipsSectionProps) {
  const hasContent =
    tips.jewellery || tips.occasions.length > 0 || tips.avoid.length > 0 || tips.notes.length > 0;

  if (!hasContent) return null;

  return (
    <section aria-label="Style tips">
      <h3 className="text-sm font-bold text-primary">Style Tips</h3>
      <div className="mt-2 rounded-[12px] border border-[#F2E4E8] bg-[#FFFBFC] px-3 py-2.5">
        <dl className="grid gap-2 text-xs">
          {tips.jewellery ? (
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 font-semibold text-foreground/55">Best Jewellery</dt>
              <dd className="font-medium text-foreground/85">{tips.jewellery}</dd>
            </div>
          ) : null}
          {tips.occasions.length ? (
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 font-semibold text-foreground/55">Occasion</dt>
              <dd className="flex flex-wrap gap-1">
                {tips.occasions.map((occasion) => (
                  <span
                    key={occasion}
                    className="rounded-full bg-[#FFF8EC] px-2 py-0.5 font-medium text-primary"
                  >
                    {occasion}
                  </span>
                ))}
              </dd>
            </div>
          ) : null}
          {tips.avoid.length ? (
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 font-semibold text-foreground/55">Avoid</dt>
              <dd className="text-foreground/65">{tips.avoid.join(", ")}</dd>
            </div>
          ) : null}
          {tips.notes.map((note) => (
            <p key={note} className="text-foreground/65">
              {note}
            </p>
          ))}
        </dl>
      </div>
    </section>
  );
}
