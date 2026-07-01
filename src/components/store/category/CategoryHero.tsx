"use client";

import type { CategoryPageData } from "@/types";
import { resolveCategoryHeroContent } from "@/lib/categories/resolve-category-hero-content";
import { CategoryHeroSection } from "@/components/store/CategoryHeroSection";

type CategoryHeroProps = {
  category: CategoryPageData;
};

/** Maps dynamic category page data onto the original CategoryHeroSection UI. */
export function CategoryHero({ category }: CategoryHeroProps) {
  const content = resolveCategoryHeroContent(category);

  return (
    <CategoryHeroSection
      title={content.title}
      description={content.description}
      ctaLabel={content.ctaLabel}
      badge={content.badge}
      features={content.features}
    />
  );
}
