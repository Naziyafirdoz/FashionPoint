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
    <div className={`flex min-w-0 flex-col justify-center ${compact ? "py-0.5" : "py-1"}`}>
      <div>
        <h3
          className={`font-display font-bold leading-tight text-primary ${
            compact ? "text-base" : "text-lg xl:text-xl"
          }`}
        >
          {categoryName}
        </h3>

        {subCategories.length > 0 ? (
          <ul className={`space-y-2.5 ${compact ? "mt-3" : "mt-4 xl:mt-5"}`}>
            {subCategories.map((sub) => (
              <li key={sub.id}>
                <Link
                  href={sub.href}
                  className={`block font-medium text-foreground/75 transition-colors duration-200 ease-out hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    compact ? "text-xs" : "text-sm xl:text-[15px]"
                  }`}
                >
                  {sub.name}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p
            className={`text-foreground/55 ${compact ? "mt-3 text-xs" : "mt-4 text-sm"}`}
          >
            No collections available.
          </p>
        )}
      </div>

      <Link
        href={categoryHref}
        className={`group/view-all mt-5 inline-flex w-fit items-center gap-1.5 font-semibold text-primary transition-colors duration-200 ease-out hover:text-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
          compact ? "text-xs" : "text-sm"
        }`}
      >
        View All
        <span
          aria-hidden="true"
          className="transition-transform duration-200 ease-out group-hover/view-all:translate-x-0.5"
        >
          →
        </span>
      </Link>
    </div>
  );
}
