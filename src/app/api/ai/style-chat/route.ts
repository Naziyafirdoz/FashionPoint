import { NextResponse } from "next/server";
import { getStyleRecommendations } from "@/lib/ai-style-chat";
import { createServiceClient } from "@/lib/supabase";
import { logAiInteraction } from "@/lib/ai-interactions";
import { MOCK_PRODUCTS } from "@/lib/mock-data";

export async function POST(req: Request) {
  const preferences = await req.json();
  const db = createServiceClient();
  let products = MOCK_PRODUCTS;
  if (db) {
    const { data } = await db.from("products").select("*").eq("is_active", true).limit(30);
    if (data?.length) products = data as typeof MOCK_PRODUCTS;
  }

  const recommendations = await getStyleRecommendations(preferences, products);

  await logAiInteraction({
    feature: "style_assistant",
    inputData: preferences as Record<string, unknown>,
    outputData: { recommendations }
  });

  return NextResponse.json({ recommendations });
}
