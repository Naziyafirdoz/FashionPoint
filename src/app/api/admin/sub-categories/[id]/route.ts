import { NextResponse } from "next/server";
import {
  getSubCategoryDescriptionValidationError,
  normalizeSubCategoryInput
} from "@/lib/admin/sub-categories";
import { requireAdmin } from "@/lib/admin/require-admin";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const { data, error } = await auth.ctx.db
    .from("sub_categories")
    .select(
      `
      id,
      category_id,
      name,
      slug,
      description,
      image_url,
      sort_order,
      is_active,
      created_at,
      categories(name),
      products(count)
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Sub category not found" }, { status: 404 });

  const products = data.products as { count: number }[] | { count: number } | null;
  const product_count = Array.isArray(products)
    ? Number(products[0]?.count ?? 0)
    : Number(products?.count ?? 0);
  const categories = data.categories as { name: string } | { name: string }[] | null;
  const category_name = Array.isArray(categories)
    ? categories[0]?.name ?? null
    : categories?.name ?? null;

  const { products: _p, categories: _c, ...sub_category } = data;
  return NextResponse.json({ sub_category: { ...sub_category, product_count, category_name } });
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json();

  const descriptionError = getSubCategoryDescriptionValidationError(body.description);
  if (descriptionError) {
    return NextResponse.json({ error: descriptionError }, { status: 400 });
  }

  const input = normalizeSubCategoryInput(body);
  if (!input) {
    return NextResponse.json({ error: "Parent category, name, and slug are required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {
    category_id: input.category_id,
    name: input.name,
    slug: input.slug
  };
  if (input.description !== undefined) updates.description = input.description;
  if (input.image_url !== undefined) updates.image_url = input.image_url;
  if (input.sort_order !== undefined) updates.sort_order = input.sort_order;
  if (input.is_active !== undefined) updates.is_active = input.is_active;

  const { data, error } = await auth.ctx.db
    .from("sub_categories")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    const message =
      error.code === "23505"
        ? "A sub category with this slug already exists for this category"
        : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }
  if (!data) return NextResponse.json({ error: "Sub category not found" }, { status: 404 });

  return NextResponse.json({ sub_category: data });
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const { count } = await auth.ctx.db
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("sub_category_id", id);

  if (count && count > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete: ${count} product${count === 1 ? "" : "s"} use this sub category. Reassign them first.`
      },
      { status: 400 }
    );
  }

  const { error } = await auth.ctx.db.from("sub_categories").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
