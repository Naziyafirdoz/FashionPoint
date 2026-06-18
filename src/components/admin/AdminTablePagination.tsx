type AdminTablePaginationProps = {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

export function AdminTablePagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange
}: AdminTablePaginationProps) {
  if (totalItems <= pageSize) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-foreground/70">
      <span>
        Showing {from}–{to} of {totalItems}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-lg border px-3 py-1.5 disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          className="rounded-lg border px-3 py-1.5 disabled:opacity-40"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
