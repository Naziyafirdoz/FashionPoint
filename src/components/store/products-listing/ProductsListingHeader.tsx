type ProductsListingHeaderProps = {
  totalProducts: number;
  activeFilterCount: number;
  recommendedSize: string | null;
};

function formatSizeBadge(label: string) {
  const match = label.match(/^([^(]+)\(([^)]+)\)$/);
  if (match) return `${match[1]} (${match[2]})`;
  return label;
}

export function ProductsListingHeader({
  totalProducts,
  activeFilterCount,
  recommendedSize
}: ProductsListingHeaderProps) {
  return (
    <header className="border-b border-[#F2E4E8] bg-white py-5 sm:py-6">
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-primary sm:text-3xl">Shop All Products</h1>
            <p className="mt-1.5 max-w-2xl text-sm text-foreground/70 sm:text-base">
              Browse our premium ready-made blouse collection.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#F3E5E8] bg-[#FFFBFC] px-3 py-1.5 text-xs font-medium text-foreground/75">
              Total Products: <span className="font-semibold text-primary">{totalProducts}</span>
            </span>
            {activeFilterCount > 0 ? (
              <span className="rounded-full border border-[#F3E5E8] bg-[#FFFBFC] px-3 py-1.5 text-xs font-medium text-foreground/75">
                Current Filters: <span className="font-semibold text-primary">{activeFilterCount}</span>
              </span>
            ) : null}
            {recommendedSize ? (
              <span className="rounded-full border border-secondary/35 bg-[#FFF8EC] px-3 py-1.5 text-xs font-semibold text-primary">
                Recommended Size: {formatSizeBadge(recommendedSize)}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
