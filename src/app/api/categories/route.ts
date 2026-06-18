import { NextResponse } from "next/server";
import { getActiveCategories } from "@/lib/categories/get-categories";

export async function GET() {
  const categories = await getActiveCategories();
  return NextResponse.json({ categories });
}
