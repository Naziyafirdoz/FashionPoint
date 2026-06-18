import type { SupabaseClient } from "@supabase/supabase-js";
import type { DetectedColor } from "@/lib/color-analysis";
import type { BlouseColorRecommendation } from "@/lib/color-matcher";

export async function saveColorMatchHistory(
  db: SupabaseClient,
  params: {
    userId: string;
    images: string[];
    detectedColors: DetectedColor[];
    recommendations: BlouseColorRecommendation[];
  }
): Promise<void> {
  const { error } = await db.from("color_match_history").insert({
    user_id: params.userId,
    images: params.images,
    detected_colors: params.detectedColors,
    recommendations: params.recommendations
  });

  if (error) {
    console.error("color_match_history insert failed:", error.message);
  }
}
