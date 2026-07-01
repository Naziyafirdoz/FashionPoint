"use client";

import { CategoryImageCard } from "@/components/store/category-mega-menu/CategoryImageCard";
import { CategorySubCategoryList } from "@/components/store/category-mega-menu/CategorySubCategoryList";
import type { CategoryMegaMenuCategory } from "@/components/store/category-mega-menu/types";
import type { NavDropdownSubCategory } from "@/lib/categories/nav-dropdown";

type CategoryMegaMenuProps = {
  category: CategoryMegaMenuCategory;
  subCategories: NavDropdownSubCategory[];
  variant?: "compact" | "full";
};

export function CategoryMegaMenu({
  category,
  subCategories,
  variant = "full"
}: CategoryMegaMenuProps) {
  const compact = variant === "compact";

  return (
    <div
      className={
        compact
          ? "w-[min(41rem,calc(100vw-2rem))] rounded-[18px] border border-accent/20 bg-white p-6 shadow-[0_12px_40px_rgba(123,13,43,0.12)]"
          : "w-[min(50rem,calc(100vw-2rem))] rounded-[18px] border border-accent/20 bg-white p-6 shadow-[0_12px_40px_rgba(123,13,43,0.12)] xl:w-[min(54rem,calc(100vw-2rem))] xl:p-8"
      }
    >
      <div
        className={`grid items-center ${
          compact ? "grid-cols-[50%_1fr] gap-9" : "grid-cols-[51%_1fr] gap-9 xl:gap-10"
        }`}
      >
        <CategoryImageCard category={category} compact={compact} />
        <CategorySubCategoryList
          categoryName={category.name}
          categoryHref={category.href}
          subCategories={subCategories}
          compact={compact}
        />
      </div>
    </div>
  );
}
