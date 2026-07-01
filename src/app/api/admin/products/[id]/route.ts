import { NextResponse } from "next/server";
import {
  countProductReviews,
  formatProductDeleteError,
  getAdminProductDetail,
  normalizeProductUpdateInput,
  PRODUCT_HAS_REVIEWS_DELETE_MESSAGE,
  updateAdminProductDetail
} from "@/lib/admin/products";
import { requireAdmin } from "@/lib/admin/require-admin";
import { clearProductColorCountCache } from "@/lib/color-products";
import { notifyDiscontinuedProductIfNeeded } from "@/lib/stock-notifications/discontinued-trigger";
import { clearSearchIndexCache } from "@/lib/search/search-products";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const product = await getAdminProductDetail(auth.ctx.db, id);

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json({ product });
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json();
  const parsed = normalizeProductUpdateInput(body);

  if (!parsed) {
    return NextResponse.json(
      { error: "Name, slug, category, and price are required" },
      { status: 400 }
    );
  }

  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const existing = await getAdminProductDetail(auth.ctx.db, id);
  if (!existing) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const result = await updateAdminProductDetail(
    auth.ctx.db,
    id,
    parsed.product,
    parsed.variants
  );

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  if (existing.status !== "archived" && parsed.product.status === "archived") {
    void notifyDiscontinuedProductIfNeeded(auth.ctx.db, {
      productId: id,
      productName: parsed.product.name,
      categoryId: existing.category_id
    }).catch((err) => {
      console.error("[back-in-stock] discontinued notify on archive failed", {
        productId: id,
        message: err instanceof Error ? err.message : String(err)
      });
    });
  }

  clearProductColorCountCache();
  clearSearchIndexCache();
  const product = await getAdminProductDetail(auth.ctx.db, id);
  return NextResponse.json({ product });
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const existing = await getAdminProductDetail(auth.ctx.db, id);
  if (!existing) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const reviewCheck = await countProductReviews(auth.ctx.db, id);
  if (reviewCheck.error) {
    return NextResponse.json({ error: "Unable to verify product reviews. Please try again." }, { status: 500 });
  }

  if (reviewCheck.count > 0) {
    return NextResponse.json({ error: PRODUCT_HAS_REVIEWS_DELETE_MESSAGE }, { status: 409 });
  }

  await notifyDiscontinuedProductIfNeeded(auth.ctx.db, {
    productId: id,
    productName: existing.name,
    categoryId: existing.category_id
  });

  const { error } = await auth.ctx.db.from("products").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: formatProductDeleteError(error) }, { status: 400 });
  }

  clearProductColorCountCache();
  clearSearchIndexCache();
  return NextResponse.json({ success: true });
}
