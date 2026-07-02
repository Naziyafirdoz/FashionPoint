import { NextResponse } from "next/server";
import { getCategoryBySlug } from "@/lib/categories/get-category-by-slug";
import { getActiveSubCategoriesByCategoryId } from "@/lib/sub-categories/get-sub-categories";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const categoryId = url.searchParams.get("category_id")?.trim();
  const categorySlug = url.searchParams.get("category_slug")?.trim();

  if (!categoryId && !categorySlug) {
    return NextResponse.json({ error: "category_id or category_slug is required" }, { status: 400 });
  }

  if (categoryId) {
    const sub_categories = await getActiveSubCategoriesByCategoryId(categoryId);
    return NextResponse.json({ sub_categories });
  }

  const category = await getCategoryBySlug(categorySlug!);
  if (!category) return NextResponse.json({ sub_categories: [] });

  const sub_categories = await getActiveSubCategoriesByCategoryId(category.id);
  return NextResponse.json({ sub_categories });
}
