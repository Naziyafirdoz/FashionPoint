"use client";

function formatLiveTime(date: Date) {
  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
}

export function AdminLiveStatus({
  lastUpdated,
  isLive,
  live
}: {
  lastUpdated: Date | null;
  isLive?: boolean;
  /** @deprecated Use `isLive` instead */
  live?: boolean;
}) {
  const showLive = isLive ?? live ?? false;

  if (!lastUpdated) return null;

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-foreground/60" aria-live="polite">
      {showLive ? (
        <>
          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
          <span className="font-medium text-emerald-700">Live</span>
          <span className="text-foreground/35" aria-hidden>
            •
          </span>
        </>
      ) : null}
      <span>Updated {formatLiveTime(lastUpdated)}</span>
    </span>
  );
}
