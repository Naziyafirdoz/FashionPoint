import OpenAI from "openai";
import type { Product } from "@/types";
import { STORE_NAME } from "@/lib/site-config";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export async function getStyleRecommendations(
  preferences: Record<string, unknown>,
  products: Product[]
) {
  const inventory = products.slice(0, 30).map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    colors: p.colors,
    fabric: p.fabric,
    occasion: p.occasion
  }));

  if (!openai) {
    return products.slice(0, 6).map((p, i) => ({
      productId: p.id,
      matchPercent: 92 - i * 3,
      reason: "Matches your style preferences"
    }));
  }

  const prompt = `You are a blouse styling expert for ${STORE_NAME} (Indian readymade blouses).
User preferences: ${JSON.stringify(preferences)}
Available inventory: ${JSON.stringify(inventory)}
Suggest top 6 products with match percentages. Return JSON only: { "recommendations": [{ "productId": "...", "matchPercent": 85, "reason": "..." }] }`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" }
  });

  const text = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(text) as {
    recommendations: { productId: string; matchPercent: number; reason: string }[];
  };
  return parsed.recommendations ?? [];
}

export async function stylistChat(message: string, products: Product[]) {
  if (!openai) {
    return {
      reply: "Here are 5 blouse designs that could match your saree. Browse our Party Wear and Designer collections!",
      productIds: products.slice(0, 5).map((p) => p.id)
    };
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are ${STORE_NAME} AI stylist. Inventory: ${JSON.stringify(products.slice(0, 20).map((p) => ({ id: p.id, name: p.name, colors: p.colors })))}. Recommend specific products. Return JSON: { "reply": "...", "productIds": ["..."] }`
      },
      { role: "user", content: message }
    ],
    response_format: { type: "json_object" }
  });

  return JSON.parse(completion.choices[0]?.message?.content ?? "{}");
}
