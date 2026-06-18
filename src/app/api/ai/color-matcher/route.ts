import { NextResponse } from "next/server";
import { z } from "zod";
import type { DetectedColor } from "@/lib/color-analysis";
import {
  buildColorMatchAnalysis,
  generateBlouseRecommendations,
  type BlouseColorRecommendation
} from "@/lib/color-matcher";
import { attachProductCounts } from "@/lib/color-products";
import { saveColorMatchHistory } from "@/lib/color-match-history";
import { logAiInteraction } from "@/lib/ai-interactions";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase";

const detectedColorSchema = z.object({
  hex: z.string(),
  rgb: z.object({ r: z.number(), g: z.number(), b: z.number() }),
  name: z.string(),
  percent: z.number(),
  role: z.enum(["primary", "secondary", "accent"]),
  displayLabel: z.string(),
  confidence: z.number(),
  uncertain: z.boolean().optional()
});

const requestSchema = z.object({
  imageUrls: z.array(z.string().min(1)).min(1).max(5),
  detectedColors: z.array(detectedColorSchema).min(1).max(5)
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Upload images and run color analysis before requesting matches." },
      { status: 400 }
    );
  }

  const { imageUrls, detectedColors } = parsed.data;
  const baseRecommendations = generateBlouseRecommendations(detectedColors as DetectedColor[]);

  const db = createServiceClient();
  const withCounts = (await attachProductCounts(
    db,
    baseRecommendations
  )) as BlouseColorRecommendation[];

  const analysis = buildColorMatchAnalysis(detectedColors as DetectedColor[], withCounts);

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user && db) {
    await saveColorMatchHistory(db, {
      userId: user.id,
      images: imageUrls,
      detectedColors: detectedColors as DetectedColor[],
      recommendations: withCounts
    });
  }

  await logAiInteraction({
    feature: "color_matcher",
    inputData: { imageUrls },
    outputData: {
      summary: analysis.summary,
      recommendations: analysis.recommendations,
      detectedColors: analysis.detectedColors
    }
  });

  return NextResponse.json({
    imageUrls,
    summary: analysis.summary,
    detectedColors: analysis.detectedColors,
    recommendations: analysis.recommendations
  });
}
