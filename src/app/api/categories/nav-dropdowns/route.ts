import { NextResponse } from "next/server";
import { getNavDropdownsBySlugs } from "@/lib/categories/nav-dropdown";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slugs = (url.searchParams.get("slugs") ?? "")
    .split(",")
    .map((slug) => slug.trim())
    .filter(Boolean);

  if (slugs.length === 0) {
    return NextResponse.json({ dropdowns: {} });
  }

  const dropdowns = await getNavDropdownsBySlugs(slugs);
  return NextResponse.json({ dropdowns });
}
