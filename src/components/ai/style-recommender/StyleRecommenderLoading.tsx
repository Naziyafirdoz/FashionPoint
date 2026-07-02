function SkeletonCard() {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[14px] border border-[#F2E4E8] bg-white p-3 shadow-[0_2px_10px_rgba(122,13,43,0.04)]">
      <div className="aspect-[4/5] animate-pulse rounded-xl bg-[#F8ECEF]" />
      <div className="mt-3 space-y-2">
        <div className="h-4 w-3/4 animate-pulse rounded bg-[#F3E5E8]" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-[#F3E5E8]" />
        <div className="h-3 w-full animate-pulse rounded bg-[#F3E5E8]" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-[#F3E5E8]" />
      </div>
      <div className="mt-auto flex gap-2 pt-3">
        <div className="h-8 flex-1 animate-pulse rounded-full bg-[#F3E5E8]" />
        <div className="h-8 flex-1 animate-pulse rounded-full bg-[#F3E5E8]" />
      </div>
    </article>
  );
}

export function StyleRecommenderLoading() {
  return (
    <div
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
      aria-busy="true"
      aria-label="Loading recommendations"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  );
}
