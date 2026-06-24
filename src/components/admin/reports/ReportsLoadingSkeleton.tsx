export function ReportsKpiSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="h-[7.5rem] animate-pulse rounded-xl border border-accent/20 bg-white p-4 shadow-card"
        >
          <div className="h-9 w-9 rounded-lg bg-blush" />
          <div className="mt-3 h-3 w-24 rounded bg-blush" />
          <div className="mt-2 h-7 w-20 rounded bg-blush" />
        </div>
      ))}
    </div>
  );
}

export function ReportsTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      <div className="h-8 animate-pulse rounded bg-blush" />
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-10 animate-pulse rounded bg-blush/70" />
      ))}
    </div>
  );
}
