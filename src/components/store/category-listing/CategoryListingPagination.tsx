"use client";

type CategoryListingPaginationProps = {
  totalProducts: number;
  visibleCount: number;
};

export function CategoryListingPagination({
  totalProducts,
  visibleCount
}: CategoryListingPaginationProps) {
  return (
    <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
      <nav className="flex items-center gap-1.5 text-sm" aria-label="Pagination">
        <button
          type="button"
          className="rounded-full border border-black/[0.08] bg-white px-4 py-2 text-foreground/70 shadow-sm transition hover:border-primary/20 hover:text-primary"
        >
          Previous
        </button>
        {[1, 2, 3].map((n) => (
          <button
            key={n}
            type="button"
            className={`min-w-[2.5rem] rounded-full px-3 py-2 transition ${
              n === 1
                ? "bg-primary text-white shadow-sm"
                : "border border-black/[0.08] bg-white text-foreground/70 shadow-sm hover:border-primary/20 hover:text-primary"
            }`}
          >
            {n}
          </button>
        ))}
        <span className="px-1 text-foreground/40">...</span>
        <button
          type="button"
          className="rounded-full border border-black/[0.08] bg-white px-4 py-2 text-foreground/70 shadow-sm transition hover:border-primary/20 hover:text-primary"
        >
          Next
        </button>
      </nav>
      <p className="text-sm text-foreground/60">
        Showing 1 to {visibleCount} of {totalProducts} products
      </p>
    </div>
  );
}
