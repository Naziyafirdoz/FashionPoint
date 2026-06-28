"use client";

import Link from "next/link";
import type { NavDropdownSubCategory } from "@/lib/categories/nav-dropdown";

type CategorySubCategoryListProps = {
  categoryName: string;
  categoryHref: string;
  subCategories: NavDropdownSubCategory[];
  compact?: boolean;
};

export function CategorySubCategoryList({
  categoryName,
  categoryHref,
  subCategories,
  compact = false
}: CategorySubCategoryListProps) {
  return (
    <div className={compact ? "min-w-0 flex-1" : "min-w-[12rem] flex-1 xl:min-w-[16rem]"}>
      <h4 className="font-display text-sm font-semibold text-primary xl:text-base">{categoryName}</h4>

      {subCategories.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {subCategories.map((sub) => (
            <li key={sub.id}>
              <Link
                href={sub.href}
                className="flex items-start gap-2 text-xs text-foreground/75 transition hover:text-secondary xl:text-[13px]"
              >
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-secondary/80" aria-hidden />
                <span>{sub.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-foreground/55">No collections available.</p>
      )}

      <Link
        href={categoryHref}
        className="mt-4 inline-block text-xs font-semibold text-primary underline-offset-2 transition hover:text-secondary hover:underline"
      >
        View All
      </Link>
    </div>
  );
}
