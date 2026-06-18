export function StatsCard({
  label,
  value,
  sub,
  active,
  emphasis,
  onClick
}: {
  label: string;
  value: string;
  sub?: string;
  active?: boolean;
  emphasis?: "warning";
  onClick?: () => void;
}) {
  const className = [
    "rounded-xl border p-5 shadow-sm transition text-left w-full",
    emphasis === "warning" ? "border-amber-300 bg-amber-50" : "bg-white",
    active
      ? "border-primary ring-2 ring-primary/20 shadow-md"
      : emphasis === "warning"
        ? "hover:border-amber-400 hover:shadow-md"
        : "border-gray-200 hover:border-gray-300 hover:shadow-md",
    onClick ? "cursor-pointer" : ""
  ]    .filter(Boolean)
    .join(" ");

  const inner = (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums text-primary">{value}</p>
      {sub ? <p className="mt-1 text-xs text-gray-400">{sub}</p> : null}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {inner}
      </button>
    );
  }

  return <div className={className}>{inner}</div>;
}
