import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CategoryHeroSection } from "@/components/store/CategoryHeroSection";
import { CategoryListing } from "@/components/store/CategoryListing";
import { getCategoryBySlug } from "@/lib/categories/get-category-by-slug";
import { getActiveSubCategoriesByCategorySlug } from "@/lib/sub-categories/get-sub-categories";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "Category" };
  return { title: `${category.name} | Fashion Point` };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const subCategories = await getActiveSubCategoriesByCategorySlug(slug);

  return (
    <>
      <CategoryHeroSection
        title={category.name}
        description={category.description ?? `Browse our ${category.name} collection.`}
      />
      <Suspense fallback={<p className="p-8 text-center">Loading…</p>}>
        <CategoryListing categorySlug={slug} subCategories={subCategories} />
      </Suspense>
    </>
  );
}
