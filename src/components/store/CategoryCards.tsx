import { CategoryCardsClient, type HomeCategory } from "@/components/store/CategoryCardsClient";
import { getHomepageCategories } from "@/lib/categories/get-categories";

export async function CategoryCards() {
  const homepageCategories = await getHomepageCategories();
  if (homepageCategories.length === 0) {
    return null;
  }

  const categories: HomeCategory[] = homepageCategories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    sort_order: category.homepage_display_order,
    description: category.description,
    image_url: category.image_url,
    homepage_banner_image_url: category.homepage_banner_image_url,
    theme: category.theme,
    button_text: category.button_text
  }));

  return <CategoryCardsClient categories={categories} />;
}
