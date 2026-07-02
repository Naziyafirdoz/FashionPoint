import type { SizeChartEntry } from "@/config/size-chart";

type SizeFinderSizeChartProps = {
  rows: SizeChartEntry[];
  recommendedSize: string | null;
};

export function SizeFinderSizeChart({ rows, recommendedSize }: SizeFinderSizeChartProps) {
  return (
    <section
      aria-labelledby="size-chart-heading"
      className="rounded-[16px] border border-[#F3E5E8] bg-white p-3 shadow-[0_2px_14px_rgba(122,13,43,0.04)] sm:p-4"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="size-chart-heading" className="font-display text-base font-bold text-primary">
          Size Chart
        </h2>
        <p className="text-[11px] text-foreground/55">Inches</p>
      </div>

      <div className="mt-2 max-h-[200px] overflow-auto rounded-lg border border-[#F3E5E8] lg:max-h-[180px]">
        <table className="w-full min-w-[360px] text-xs">
          <thead className="sticky top-0 z-10 bg-[#FFF8F8]">
            <tr className="border-b border-[#F3E5E8] text-left text-primary">
              <th className="px-2 py-2 font-semibold">Size</th>
              <th className="px-2 py-2 font-semibold">Bust</th>
              <th className="px-2 py-2 font-semibold">Under</th>
              <th className="px-2 py-2 font-semibold">Waist</th>
              <th className="px-2 py-2 font-semibold">Shldr</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((size) => {
              const isRecommended = recommendedSize === size.label;
              return (
                <tr
                  key={size.label}
                  className={
                    isRecommended
                      ? "bg-primary/10 font-semibold text-primary"
                      : "border-b border-[#F3E5E8] text-foreground/80"
                  }
                  aria-current={isRecommended ? "true" : undefined}
                >
                  <td className="px-2 py-1.5">
                    {isRecommended ? (
                      <span className="inline-flex items-center gap-1">
                        {size.label}
                        <span className="rounded-full bg-primary px-1.5 py-px text-[9px] font-bold uppercase text-white">
                          Match
                        </span>
                      </span>
                    ) : (
                      size.label
                    )}
                  </td>
                  <td className="px-2 py-1.5">{size.bust}</td>
                  <td className="px-2 py-1.5">{size.underbust}</td>
                  <td className="px-2 py-1.5">{size.waist}</td>
                  <td className="px-2 py-1.5">{size.shoulder}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
