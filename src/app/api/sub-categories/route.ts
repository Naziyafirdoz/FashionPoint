import { NextResponse } from "next/server";
import { getActiveSubCategoriesByCategoryId } from "@/lib/sub-categories/get-sub-categories";
import { createServiceClient } from "@/lib/supabase";

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

  const db = createServiceClient();
  if (!db) return NextResponse.json({ sub_categories: [] });

  const { data: category } = await db
    .from("categories")
    .select("id")
    .eq("slug", categorySlug!)
    .eq("is_active", true)
    .maybeSingle();

  if (!category) return NextResponse.json({ sub_categories: [] });

  const sub_categories = await getActiveSubCategoriesByCategoryId(String(category.id));
  return NextResponse.json({ sub_categories });
}
