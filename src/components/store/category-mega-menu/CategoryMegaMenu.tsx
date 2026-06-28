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
          ? "w-[min(36rem,calc(100vw-2rem))] rounded-xl border border-accent/20 bg-white p-4 shadow-xl"
          : "w-[min(44rem,calc(100vw-2rem))] rounded-xl border border-accent/20 bg-white p-5 shadow-xl xl:w-[min(48rem,calc(100vw-2rem))] xl:p-6"
      }
    >
      <div className="flex gap-4 xl:gap-6">
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
