"use client";

type RefundAttentionBannerProps = {
  dueToday: number;
  overdue: number;
  upcoming?: number;
  onViewQueue: () => void;
};

export function RefundAttentionBanner({
  dueToday,
  overdue,
  upcoming = 0,
  onViewQueue
}: RefundAttentionBannerProps) {
  if (dueToday === 0 && overdue === 0 && upcoming === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold text-amber-900">Refund Attention Required</p>
        <p className="mt-1 text-sm text-amber-800">
          Due Today: {dueToday} · Overdue: {overdue} · Upcoming: {upcoming}
        </p>
      </div>
      <button type="button" className="btn-primary shrink-0" onClick={onViewQueue}>
        View Refund Queue
      </button>
    </div>
  );
}
