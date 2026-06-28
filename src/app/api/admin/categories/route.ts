import { NextResponse } from "next/server";
import {
  getAdminCategoriesSummary,
  getCategoryDescriptionValidationError,
  getHomepageFieldsValidationError,
  listAdminCategories,
  normalizeCategoryInput
} from "@/lib/admin/categories";import { requireAdmin } from "@/lib/admin/require-admin";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const categories = await listAdminCategories(auth.ctx.db);
  const summary = await getAdminCategoriesSummary(auth.ctx.db, categories);

  return NextResponse.json({ categories, summary });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json();

  const descriptionError = getCategoryDescriptionValidationError(body.description);
  if (descriptionError) {
    return NextResponse.json({ error: descriptionError }, { status: 400 });
  }

  const homepageError = getHomepageFieldsValidationError(body);
  if (homepageError) {
    return NextResponse.json({ error: homepageError }, { status: 400 });
  }

  const input = normalizeCategoryInput(body);
  if (!input) {
    return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
  }
  const { data, error } = await auth.ctx.db
    .from("categories")
    .insert({
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      image_url: input.image_url ?? null,
      sort_order: input.sort_order ?? 0,
      is_active: input.is_active ?? true,
      show_in_navbar: input.show_in_navbar ?? false,
      show_on_homepage: input.show_on_homepage ?? false,
      homepage_description: input.homepage_description ?? null,
      homepage_display_order: input.homepage_display_order ?? 0,
      homepage_theme: input.homepage_theme ?? "blush",
      homepage_button_text: input.homepage_button_text ?? "Explore Collection",
      homepage_banner_image_url: input.homepage_banner_image_url ?? null
    })
    .select()
    .single();

  if (error) {
    const message =
      error.code === "23505" ? "A category with this slug already exists" : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ category: data }, { status: 201 });
}
