import { notFound } from "next/navigation";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { CategoryHero } from "@/components/store/category/CategoryHero";
import { CategoryListing } from "@/components/store/CategoryListing";
import { RelatedCategories } from "@/components/store/category/RelatedCategories";
import {
  buildCategoryMetadata,
  getCategoryPageBundle
} from "@/lib/categories/get-category-page-data";

const CategoryRecentlyViewed = dynamic(
  () =>
    import("@/components/store/category/CategoryRecentlyViewed").then(
      (mod) => mod.CategoryRecentlyViewed
    ),
  { loading: () => null }
);

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const bundle = await getCategoryPageBundle(slug);
  if (!bundle) return { title: "Category" };
  return buildCategoryMetadata(bundle.category);
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const bundle = await getCategoryPageBundle(slug);
  if (!bundle) notFound();

  const { category, subCategories, relatedCategories } = bundle;

  return (
    <>
      <CategoryHero category={category} />
      <Suspense
        fallback={
          <p className="bg-[#FFF8F8] p-8 text-center text-sm text-[#777777]">Loading…</p>
        }
      >
        <CategoryListing category={category} subCategories={subCategories} />
      </Suspense>
      <RelatedCategories categories={relatedCategories} />
      <CategoryRecentlyViewed />
    </>
  );
}
