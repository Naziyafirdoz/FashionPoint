"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getPaginationRange } from "@/lib/products/pagination-range";

const HOVER_PILL =
  "transition duration-200 hover:border-primary/40 hover:bg-[#FFF5F7] hover:text-primary";

type CategoryListingPaginationProps = {
  page: number;
  totalPages: number;
};

export function CategoryListingPagination({ page, totalPages }: CategoryListingPaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const goToPage = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;

    const params = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(nextPage));
    }

    router.push(`${pathname}?${params.toString()}`, { scroll: true });
  };

  const pageButtonClass = (active: boolean) =>
    `flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition duration-200 ${
      active
        ? "bg-primary text-white"
        : `border border-[#F2E4E8] bg-white text-[#2A2A2A] ${HOVER_PILL}`
    }`;

  const navButtonClass = `flex h-10 w-10 items-center justify-center rounded-full border border-[#F2E4E8] bg-white text-sm text-[#666666] disabled:cursor-not-allowed disabled:opacity-40 ${HOVER_PILL}`;

  const range = getPaginationRange(page, totalPages);

  return (
    <nav
      className="mt-6 flex w-full flex-wrap items-center justify-center gap-2"
      aria-label="Pagination"
    >
      <button
        type="button"
        className={navButtonClass}
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => goToPage(page - 1)}
      >
        &lt;
      </button>
      {range.map((item, index) =>
        item === "ellipsis" ? (
          <span key={`ellipsis-${index}`} className="px-1 text-sm text-[#666666]">
            ...
          </span>
        ) : (
          <button
            key={item}
            type="button"
            className={pageButtonClass(item === page)}
            aria-current={item === page ? "page" : undefined}
            onClick={() => goToPage(item)}
          >
            {item}
          </button>
        )
      )}
      <button
        type="button"
        className={navButtonClass}
        aria-label="Next page"
        disabled={page >= totalPages}
        onClick={() => goToPage(page + 1)}
      >
        &gt;
      </button>
    </nav>
  );
}
