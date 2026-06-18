import { NextResponse } from "next/server";
import {
  getCategoryDescriptionValidationError,
  normalizeCategoryInput
} from "@/lib/admin/categories";import { requireAdmin } from "@/lib/admin/require-admin";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const { data, error } = await auth.ctx.db
    .from("categories")
    .select(
      `
      id,
      name,
      slug,
      description,
      image_url,
      sort_order,
      is_active,
      created_at,
      products(count)
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Category not found" }, { status: 404 });

  const products = data.products as { count: number }[] | { count: number } | null;
  const product_count = Array.isArray(products)
    ? Number(products[0]?.count ?? 0)
    : Number(products?.count ?? 0);

  const { products: _products, ...category } = data;
  return NextResponse.json({ category: { ...category, product_count } });
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json();

  const descriptionError = getCategoryDescriptionValidationError(body.description);
  if (descriptionError) {
    return NextResponse.json({ error: descriptionError }, { status: 400 });
  }

  const input = normalizeCategoryInput(body);
  if (!input) {
    return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
  }
  const updates: Record<string, unknown> = {
    name: input.name,
    slug: input.slug
  };
  if (input.description !== undefined) updates.description = input.description;
  if (input.image_url !== undefined) updates.image_url = input.image_url;
  if (input.sort_order !== undefined) updates.sort_order = input.sort_order;
  if (input.is_active !== undefined) updates.is_active = input.is_active;

  const { data, error } = await auth.ctx.db
    .from("categories")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    const message =
      error.code === "23505" ? "A category with this slug already exists" : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }
  if (!data) return NextResponse.json({ error: "Category not found" }, { status: 404 });

  return NextResponse.json({ category: data });
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const { count } = await auth.ctx.db
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("category_id", id);

  if (count && count > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete: ${count} product${count === 1 ? "" : "s"} use this category. Reassign or delete them first.`
      },
      { status: 400 }
    );
  }

  const { error } = await auth.ctx.db.from("categories").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
