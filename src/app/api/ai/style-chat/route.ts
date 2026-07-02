import { NextResponse } from "next/server";
import { getStyleRecommendations } from "@/lib/ai-style-chat";
import { createServiceClient } from "@/lib/supabase";
import { logAiInteraction } from "@/lib/ai-interactions";
import {
  loadStyleRecommenderCatalog,
  productsForRecommendations
} from "@/lib/style-recommender-catalog";

export async function POST(req: Request) {
  const preferences = await req.json();
  const db = createServiceClient();

  if (!db) {
    return NextResponse.json({ recommendations: [], products: [] });
  }

  const products = await loadStyleRecommenderCatalog(db);
  const recommendations = await getStyleRecommendations(preferences, products);
  const matchedProducts = productsForRecommendations(products, recommendations);

  await logAiInteraction({
    feature: "style_assistant",
    inputData: preferences as Record<string, unknown>,
    outputData: { recommendations }
  });

  return NextResponse.json({
    recommendations,
    products: matchedProducts
  });
}
