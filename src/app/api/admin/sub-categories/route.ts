import { NextResponse } from "next/server";
import {
  getSubCategoryDescriptionValidationError,
  listAdminSubCategories,
  normalizeSubCategoryInput
} from "@/lib/admin/sub-categories";
import { requireAdmin } from "@/lib/admin/require-admin";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const sub_categories = await listAdminSubCategories(auth.ctx.db);
  return NextResponse.json({ sub_categories });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const descriptionError = getSubCategoryDescriptionValidationError(body.description);
  if (descriptionError) {
    return NextResponse.json({ error: descriptionError }, { status: 400 });
  }

  const input = normalizeSubCategoryInput(body);
  if (!input) {
    return NextResponse.json({ error: "Parent category, name, and slug are required" }, { status: 400 });
  }

  const { data, error } = await auth.ctx.db
    .from("sub_categories")
    .insert({
      category_id: input.category_id,
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      image_url: input.image_url ?? null,
      sort_order: input.sort_order ?? 0,
      is_active: input.is_active ?? true
    })
    .select()
    .single();

  if (error) {
    const message =
      error.code === "23505"
        ? "A sub category with this slug already exists for this category"
        : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ sub_category: data }, { status: 201 });
}
