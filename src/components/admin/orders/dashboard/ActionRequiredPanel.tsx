"use client";

type ActionItem = {
  id: string;
  label: string;
  count: number;
  onClick: () => void;
};

type ActionRequiredPanelProps = {
  items: ActionItem[];
};

export function ActionRequiredPanel({ items }: ActionRequiredPanelProps) {
  const actionable = items.filter((i) => i.count > 0);
  if (actionable.length === 0) return null;

  return (
    <section
      aria-label="Action required"
      className="sticky top-0 z-20 rounded-xl border border-amber-200 bg-amber-50/95 p-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-amber-50/90"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-2 w-2 rounded-full bg-amber-500" aria-hidden />
        <h2 className="text-sm font-semibold text-amber-950">Action Required</h2>
      </div>
      <ul className="divide-y divide-amber-200/80 rounded-lg border border-amber-200/60 bg-white">
        {actionable.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={item.onClick}
              className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm transition hover:bg-amber-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className="font-medium text-gray-900">{item.label}</span>
              <span className="min-w-[2rem] rounded-full bg-amber-100 px-2.5 py-0.5 text-center text-xs font-bold text-amber-900 tabular-nums">
                {item.count}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
