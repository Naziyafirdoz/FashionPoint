type CategoryEmptyStateProps = {
  hasActiveFilters: boolean;
};

export function CategoryEmptyState({ hasActiveFilters }: CategoryEmptyStateProps) {
  return (
    <div className="flex w-full flex-col items-center justify-center rounded-[18px] border border-dashed border-[#F2E4E8] bg-[#FFFCFC] px-6 py-14 text-center">
      <p className="font-display text-lg font-bold text-[#7B0D2B]">
        {hasActiveFilters ? "No products match your filters" : "No products in this category yet"}
      </p>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-[#666666]">
        {hasActiveFilters
          ? "Try adjusting or clearing your filters to see more items."
          : "Check back soon — new styles are added regularly."}
      </p>
    </div>
  );
}
