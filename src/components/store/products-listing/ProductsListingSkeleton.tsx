export function ProductsListingSkeleton() {
  return (
    <div className="grid w-full min-w-0 grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="h-[380px] animate-pulse rounded-[18px] border border-[#F2E4E8] bg-[#FFF5F7]"
        />
      ))}
    </div>
  );
}
