import { notFound } from "next/navigation";
import { Suspense } from "react";
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
    <Suspense fallback={<p className="p-8 text-center">Loading…</p>}>
      <CategoryListing
        categorySlug={slug}
        title={category.name}
        subtitle={category.description ?? `Browse our ${category.name} collection.`}
        heroImage={category.image_url}
        subCategories={subCategories}
      />
    </Suspense>
  );
}
