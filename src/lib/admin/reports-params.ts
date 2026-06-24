export type ReportsRangeKey =
  | "today"
  | "yesterday"
  | "7d"
  | "30d"
  | "month"
  | "prev_month"
  | "custom";

export type ReportsCustomRange = {
  start: string;
  end: string;
};

export const REPORTS_RANGE_OPTIONS: { value: ReportsRangeKey; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "month", label: "This Month" },
  { value: "prev_month", label: "Previous Month" },
  { value: "custom", label: "Custom Range" }
];

export const EXPORT_RANGE_OPTIONS = REPORTS_RANGE_OPTIONS.filter((option) =>
  ["today", "7d", "30d", "month", "custom"].includes(option.value)
);

export const REPORT_PAGE_SIZES = [25, 50, 100, 250] as const;
export type ReportPageSize = (typeof REPORT_PAGE_SIZES)[number];

export const DEFAULT_REPORT_RANGE: ReportsRangeKey = "30d";
export const DEFAULT_REPORT_PAGE_SIZE: ReportPageSize = 25;

export type ReportsQueryState = {
  range: ReportsRangeKey;
  from: string;
  to: string;
  page: number;
  limit: ReportPageSize;
  search: string;
};

export function parseReportsQueryState(searchParams: URLSearchParams): ReportsQueryState {
  const rangeParam = searchParams.get("range") as ReportsRangeKey | null;
  const range = REPORTS_RANGE_OPTIONS.some((option) => option.value === rangeParam)
    ? (rangeParam as ReportsRangeKey)
    : DEFAULT_REPORT_RANGE;

  const limitParam = Number(searchParams.get("limit") ?? String(DEFAULT_REPORT_PAGE_SIZE));
  const limit = REPORT_PAGE_SIZES.includes(limitParam as ReportPageSize)
    ? (limitParam as ReportPageSize)
    : DEFAULT_REPORT_PAGE_SIZE;

  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  return {
    range,
    from: searchParams.get("from") ?? "",
    to: searchParams.get("to") ?? "",
    page,
    limit,
    search: searchParams.get("search") ?? ""
  };
}

export function buildReportsQueryString(
  state: Partial<ReportsQueryState>,
  base?: ReportsQueryState
): string {
  const next: ReportsQueryState = {
    range: state.range ?? base?.range ?? DEFAULT_REPORT_RANGE,
    from: state.from ?? base?.from ?? "",
    to: state.to ?? base?.to ?? "",
    page: state.page ?? base?.page ?? 1,
    limit: state.limit ?? base?.limit ?? DEFAULT_REPORT_PAGE_SIZE,
    search: state.search ?? base?.search ?? ""
  };

  const params = new URLSearchParams();
  params.set("range", next.range);

  if (next.range === "custom") {
    if (next.from) params.set("from", next.from);
    if (next.to) params.set("to", next.to);
  }

  if (next.page > 1) params.set("page", String(next.page));
  if (next.limit !== DEFAULT_REPORT_PAGE_SIZE) params.set("limit", String(next.limit));
  if (next.search.trim()) params.set("search", next.search.trim());

  return params.toString();
}

export function formatReportUpdatedAt(date: Date): string {
  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
}
