import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { getSearchSuggestions, searchProducts } from "@/lib/search/search-products";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  const productsMode = url.searchParams.get("products") === "1";
  const limit = Number(url.searchParams.get("limit")) || (productsMode ? 48 : 8);
  const page = Number(url.searchParams.get("page")) || 1;

  if (!query) {
    return NextResponse.json({ suggestions: [], products: [], total: 0 });
  }

  const db = createServiceClient();
  if (!db) {
    return NextResponse.json(
      { suggestions: [], products: [], total: 0, error: "Search unavailable" },
      { status: 503 }
    );
  }

  try {
    if (productsMode) {
      const result = await searchProducts(db, { query, page, limit });
      return NextResponse.json(result);
    }

    const suggestions = await getSearchSuggestions(db, query, limit);
    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json(
      { suggestions: [], products: [], total: 0, error: "Search failed" },
      { status: 500 }
    );
  }
}
