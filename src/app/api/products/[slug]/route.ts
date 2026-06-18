import { NextResponse } from "next/server";
import { getProductBySlugFromDb } from "@/lib/products/get-by-slug";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const { slug } = await params;
  const product = await getProductBySlugFromDb(slug);

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json({ product });
}
