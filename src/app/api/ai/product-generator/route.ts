import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export async function POST(req: Request) {
  const { imageUrl } = await req.json();
  if (!imageUrl) return NextResponse.json({ error: "imageUrl required" }, { status: 400 });

  if (!openai) {
    return NextResponse.json({
      productName: "Designer Blouse",
      shortDescription: "Elegant blouse with premium detailing.",
      detailedDescription: "A beautifully crafted readymade blouse.",
      primaryColor: "Pink",
      fabric: "Silk",
      neckType: "Boat Neck",
      sleeveType: "Half Sleeve",
      tags: ["designer", "festive"]
    });
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Analyze this Indian blouse image. Return JSON: productName, shortDescription (150 chars), detailedDescription, primaryColor, secondaryColor, fabric, neckType, sleeveType, workType, occasion[], category, tags[], seoTitle, seoDescription`
          },
          { type: "image_url", image_url: { url: imageUrl } }
        ]
      }
    ],
    response_format: { type: "json_object" }
  });

  const generated = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
  return NextResponse.json(generated);
}
