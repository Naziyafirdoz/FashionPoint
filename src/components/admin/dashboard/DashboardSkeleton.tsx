function Bone({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-blush-dark/60 ${className ?? ""}`} />;
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-white p-4 shadow-card">
            <Bone className="h-3 w-20" />
            <Bone className="mt-3 h-8 w-24" />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Bone key={i} className="h-10 w-32 rounded-full" />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border bg-white p-6 shadow-card lg:col-span-2">
          <Bone className="h-5 w-40" />
          <Bone className="mt-6 h-64 w-full" />
        </div>
        <div className="rounded-2xl border bg-white p-6 shadow-card">
          <Bone className="h-5 w-36" />
          <Bone className="mt-6 h-64 w-full" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border bg-white p-6 shadow-card">
            <Bone className="h-5 w-32" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((__, j) => (
                <Bone key={j} className="h-10 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
