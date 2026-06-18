import { NextResponse } from "next/server";
import { MOCK_PRODUCTS } from "@/lib/mock-data";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.toLowerCase() ?? "";
  if (!q) return NextResponse.json({ suggestions: [] });

  const suggestions = new Set<string>();
  for (const p of MOCK_PRODUCTS) {
    if (p.name.toLowerCase().includes(q)) suggestions.add(p.name);
    p.colors?.forEach((c) => {
      if (c.toLowerCase().includes(q) || q.includes(c.toLowerCase().slice(0, 3))) {
        suggestions.add(`${c} ${p.fabric ?? ""} Blouse`.trim());
        suggestions.add(`${c} Party Wear`);
      }
    });
    if (p.fabric?.toLowerCase().includes(q)) suggestions.add(`${p.fabric} Blouse`);
  }

  return NextResponse.json({ suggestions: [...suggestions].slice(0, 8) });
}
