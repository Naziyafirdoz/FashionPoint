import { redirect } from "next/navigation";
import { getCategoryUrl } from "@/lib/categories/category-url";
import { getCategoryBySlug } from "@/lib/categories/get-category-by-slug";

export default async function OffersPage() {
  const category = await getCategoryBySlug("offers");
  if (category) {
    redirect(getCategoryUrl(category));
  }

  redirect("/products");
}
