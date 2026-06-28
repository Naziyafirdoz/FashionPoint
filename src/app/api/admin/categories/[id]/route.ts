import { NextResponse } from "next/server";
import {
  getCategoryDescriptionValidationError,
  getHomepageFieldsValidationError,
  getNavbarPositionValidationError,
  getNextNavbarPosition,
  normalizeCategoryInput,
  syncNavbarPositions
} from "@/lib/admin/categories";
import { requireAdmin } from "@/lib/admin/require-admin";

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
      show_in_navbar,
      navbar_position,
      show_on_homepage,
      homepage_description,
      homepage_display_order,
      homepage_theme,
      homepage_button_text,
      homepage_banner_image_url,
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

  const homepageError = getHomepageFieldsValidationError(body);
  if (homepageError) {
    return NextResponse.json({ error: homepageError }, { status: 400 });
  }

  const navbarPositionError = getNavbarPositionValidationError(body.navbar_position);
  if (navbarPositionError) {
    return NextResponse.json({ error: navbarPositionError }, { status: 400 });
  }

  const input = normalizeCategoryInput(body);
  if (!input) {
    return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
  }

  const { data: existing, error: existingError } = await auth.ctx.db
    .from("categories")
    .select("show_in_navbar, navbar_position")
    .eq("id", id)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 400 });
  }
  if (!existing) return NextResponse.json({ error: "Category not found" }, { status: 404 });

  const updates: Record<string, unknown> = {
    name: input.name,
    slug: input.slug
  };
  if (input.description !== undefined) updates.description = input.description;
  if (input.image_url !== undefined) updates.image_url = input.image_url;
  if (input.sort_order !== undefined) updates.sort_order = input.sort_order;
  if (input.is_active !== undefined) updates.is_active = input.is_active;
  if (input.show_on_homepage !== undefined) updates.show_on_homepage = input.show_on_homepage;
  if (input.homepage_description !== undefined) {
    updates.homepage_description = input.homepage_description;
  }
  if (input.homepage_display_order !== undefined) {
    updates.homepage_display_order = input.homepage_display_order;
  }
  if (input.homepage_theme !== undefined) updates.homepage_theme = input.homepage_theme;
  if (input.homepage_button_text !== undefined) {
    updates.homepage_button_text = input.homepage_button_text;
  }
  if (input.homepage_banner_image_url !== undefined) {
    updates.homepage_banner_image_url = input.homepage_banner_image_url;
  }

  const nextShowInNavbar =
    input.show_in_navbar !== undefined ? input.show_in_navbar : Boolean(existing.show_in_navbar);

  if (input.show_in_navbar !== undefined) {
    updates.show_in_navbar = input.show_in_navbar;
  }

  if (!nextShowInNavbar) {
    updates.navbar_position = null;
  } else if (input.navbar_position !== undefined) {
    updates.navbar_position = input.navbar_position;
  } else if (input.show_in_navbar === true && !existing.show_in_navbar) {
    updates.navbar_position = await getNextNavbarPosition(auth.ctx.db);
  }

  const shouldSyncNavbar =
    input.show_in_navbar !== undefined ||
    input.navbar_position !== undefined ||
    updates.navbar_position !== undefined;

  const { error } = await auth.ctx.db.from("categories").update(updates).eq("id", id);

  if (error) {
    const message =
      error.code === "23505" ? "A category with this slug already exists" : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (shouldSyncNavbar) {
    await syncNavbarPositions(auth.ctx.db);
  }

  const { data, error: fetchError } = await auth.ctx.db
    .from("categories")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 400 });
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

  await syncNavbarPositions(auth.ctx.db);

  return NextResponse.json({ success: true });
}
