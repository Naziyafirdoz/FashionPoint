import { NextResponse } from "next/server";
import { stylistChat } from "@/lib/ai-style-chat";
import { MOCK_PRODUCTS } from "@/lib/mock-data";
import { createServiceClient } from "@/lib/supabase";
import { logAiInteraction } from "@/lib/ai-interactions";

export async function POST(req: Request) {
  const { message } = await req.json();
  const db = createServiceClient();
  let products = MOCK_PRODUCTS;
  if (db) {
    const { data } = await db.from("products").select("id,name,colors,slug,price").eq("is_active", true).limit(20);
    if (data?.length) products = data as typeof MOCK_PRODUCTS;
  }

  const result = await stylistChat(message, products);

  await logAiInteraction({
    feature: "style_assistant",
    inputData: { message },
    outputData: result as Record<string, unknown>
  });

  return NextResponse.json(result);
}
