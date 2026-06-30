"use client";

import type { CategoryPageData } from "@/types";
import { CategoryHeroSection } from "@/components/store/CategoryHeroSection";

type CategoryHeroProps = {
  category: CategoryPageData;
};

/** Maps dynamic category page data onto the original CategoryHeroSection UI. */
export function CategoryHero({ category }: CategoryHeroProps) {
  const description =
    category.description?.trim() || category.hero_subtitle?.trim() || "";

  return (
    <CategoryHeroSection
      title={category.name}
      description={description}
      ctaLabel={category.cta_label?.trim() || undefined}
    />
  );
}
