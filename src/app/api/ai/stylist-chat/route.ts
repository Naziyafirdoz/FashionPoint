import { NextResponse } from "next/server";
import { stylistChat } from "@/lib/ai-style-chat";
import { createServiceClient } from "@/lib/supabase";
import { logAiInteraction } from "@/lib/ai-interactions";
import { loadStyleRecommenderCatalog } from "@/lib/style-recommender-catalog";
import type { Category } from "@/types";
import type { StylistSessionFilters } from "@/lib/stylist-assistant/types";

export async function POST(req: Request) {
  const body = await req.json();
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const sessionFilters = (body.sessionFilters ?? {}) as StylistSessionFilters;
  const fromQuickChip = Boolean(body.fromQuickChip);

  if (!message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const db = createServiceClient();
  if (!db) {
    return NextResponse.json({
      reply: "I couldn't find a matching product in our current collection.",
      products: [],
      sessionFilters: {},
      intent: "product_search"
    });
  }

  const [products, categoriesResult] = await Promise.all([
    loadStyleRecommenderCatalog(db),
    db.from("categories").select("*").eq("is_active", true).order("sort_order", { ascending: true })
  ]);

  const categories = (categoriesResult.data ?? []) as Category[];

  const productsWithCategories = products.map((product) => ({
    ...product,
    category:
      product.category ??
      (product.category_id
        ? categories.find((category) => category.id === product.category_id)
        : undefined)
  }));

  const result = stylistChat({
    message,
    sessionFilters,
    products: productsWithCategories,
    categories,
    fromQuickChip
  });

  await logAiInteraction({
    feature: "style_assistant",
    inputData: { message, sessionFilters },
    outputData: {
      reply: result.reply,
      intent: result.intent,
      productIds: result.products.map((entry) => entry.product.id),
      sessionFilters: result.sessionFilters
    }
  });

  return NextResponse.json(result);
}
