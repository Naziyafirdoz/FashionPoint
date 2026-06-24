"use client";

import {
  DEFAULT_REPORT_RANGE,
  REPORT_PAGE_SIZES,
  REPORTS_RANGE_OPTIONS,
  type ReportsQueryState,
  type ReportsRangeKey
} from "@/lib/admin/reports-params";

type ReportsDateFilterProps = {
  query: ReportsQueryState;
  onChange: (patch: Partial<ReportsQueryState>) => void;
  options?: { value: ReportsRangeKey; label: string }[];
};

export function ReportsDateFilter({
  query,
  onChange,
  options = REPORTS_RANGE_OPTIONS
}: ReportsDateFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Report date range"
        value={query.range}
        onChange={(e) =>
          onChange({
            range: e.target.value as ReportsRangeKey,
            page: 1,
            from: e.target.value === "custom" ? query.from : "",
            to: e.target.value === "custom" ? query.to : ""
          })
        }
        className="h-9 rounded-lg border border-accent/30 bg-white px-3 text-sm text-primary shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {query.range === "custom" ? (
        <>
          <input
            type="date"
            aria-label="Custom start date"
            value={query.from}
            onChange={(e) => onChange({ from: e.target.value, page: 1 })}
            className="h-9 rounded-lg border border-accent/30 bg-white px-3 text-sm"
          />
          <input
            type="date"
            aria-label="Custom end date"
            value={query.to}
            onChange={(e) => onChange({ to: e.target.value, page: 1 })}
            className="h-9 rounded-lg border border-accent/30 bg-white px-3 text-sm"
          />
        </>
      ) : null}
    </div>
  );
}

type ReportsToolbarProps = {
  query: ReportsQueryState;
  onChange: (patch: Partial<ReportsQueryState>) => void;
  searchPlaceholder?: string;
  showSearch?: boolean;
  dateOptions?: { value: ReportsRangeKey; label: string }[];
};

export function ReportsToolbar({
  query,
  onChange,
  searchPlaceholder = "Search…",
  showSearch = true,
  dateOptions
}: ReportsToolbarProps) {
  return (
    <div className="flex flex-col gap-3">
      <ReportsDateFilter query={query} onChange={onChange} options={dateOptions} />

      <div className="flex flex-wrap items-center gap-2">
        {showSearch ? (
          <input
            type="search"
            aria-label="Search report"
            placeholder={searchPlaceholder}
            value={query.search}
            onChange={(e) => onChange({ search: e.target.value, page: 1 })}
            className="h-9 min-w-[12rem] flex-1 rounded-lg border border-accent/30 bg-white px-3 text-sm"
          />
        ) : null}
        <select
          aria-label="Rows per page"
          value={query.limit}
          onChange={(e) => onChange({ limit: Number(e.target.value) as ReportsQueryState["limit"], page: 1 })}
          className="h-9 rounded-lg border border-accent/30 bg-white px-3 text-sm"
        >
          {REPORT_PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size} rows
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export { DEFAULT_REPORT_RANGE };
