import {
  DASHBOARD_RANGE_OPTIONS,
  type DashboardDateRangeState,
  type DashboardRangeKey
} from "@/lib/admin/dashboard-date-range";

type DashboardDateRangeFilterProps = {
  value: DashboardDateRangeState;
  onChange: (patch: Partial<DashboardDateRangeState>) => void;
};

export function DashboardDateRangeFilter({ value, onChange }: DashboardDateRangeFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Dashboard date range"
        value={value.range}
        onChange={(e) =>
          onChange({
            range: e.target.value as DashboardRangeKey,
            from: e.target.value === "custom" ? value.from : "",
            to: e.target.value === "custom" ? value.to : ""
          })
        }
        className="h-9 rounded-lg border border-accent/30 bg-white px-3 text-sm text-primary shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        {DASHBOARD_RANGE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {value.range === "custom" ? (
        <>
          <input
            type="date"
            aria-label="Custom start date"
            value={value.from}
            onChange={(e) => onChange({ from: e.target.value })}
            className="h-9 rounded-lg border border-accent/30 bg-white px-3 text-sm"
          />
          <input
            type="date"
            aria-label="Custom end date"
            value={value.to}
            onChange={(e) => onChange({ to: e.target.value })}
            className="h-9 rounded-lg border border-accent/30 bg-white px-3 text-sm"
          />
        </>
      ) : null}
    </div>
  );
}
