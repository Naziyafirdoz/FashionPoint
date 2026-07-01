import Link from "next/link";
import { getCategoryUrl } from "@/lib/categories/category-url";
import type { CategoryPageData } from "@/types";

type CategoryBreadcrumbProps = {
  category: Pick<CategoryPageData, "name" | "slug">;
  subCategoryName?: string | null;
};

export function CategoryBreadcrumb({ category, subCategoryName }: CategoryBreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-2 flex flex-wrap items-center gap-1 text-[12px] text-foreground/55 sm:text-[13px]"
    >
      <Link href="/" className="transition hover:text-primary">
        Home
      </Link>
      <span className="text-foreground/40" aria-hidden="true">
        &gt;
      </span>
      {subCategoryName ? (
        <>
          <Link href={getCategoryUrl(category.slug)} className="transition hover:text-primary">
            {category.name}
          </Link>
          <span className="text-foreground/40" aria-hidden="true">
            &gt;
          </span>
          <span className="font-medium text-foreground/65">{subCategoryName}</span>
        </>
      ) : (
        <span className="font-medium text-foreground/65">{category.name}</span>
      )}
    </nav>
  );
}
