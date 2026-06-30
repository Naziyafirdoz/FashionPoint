import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CategoryHeroSection } from "@/components/store/CategoryHeroSection";
import { CategoryListing } from "@/components/store/CategoryListing";
import { getCategoryBySlug } from "@/lib/categories/get-category-by-slug";
import { getActiveSubCategoriesByCategorySlug } from "@/lib/sub-categories/get-sub-categories";

const CATEGORY_SLUG = "daily-wear";

export async function generateMetadata() {
  const category = await getCategoryBySlug(CATEGORY_SLUG);
  if (!category) return { title: "Daily Wear" };
  return { title: `${category.name} | Fashion Point` };
}

export default async function DailyWearPage() {
  const category = await getCategoryBySlug(CATEGORY_SLUG);
  if (!category) notFound();

  const subCategories = await getActiveSubCategoriesByCategorySlug(CATEGORY_SLUG);

  return (
    <>
      <CategoryHeroSection
        title={category.name}
        description={category.description ?? `Browse our ${category.name} collection.`}
        imageUrl={category.image_url}
      />
      <Suspense fallback={<p className="bg-[#FFF8F8] p-8 text-center text-sm text-[#777777]">Loading…</p>}>
        <CategoryListing
          categorySlug={CATEGORY_SLUG}
          basePath="/daily-wear"
          subCategories={subCategories}
        />
      </Suspense>
    </>
  );
}
