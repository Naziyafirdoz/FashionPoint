import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase";
import type { AiFeature } from "@/types";

export async function logAiInteraction(params: {
  feature: AiFeature;
  inputData: Record<string, unknown>;
  outputData: Record<string, unknown>;
  wasSuccessful?: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return;

  const db = createServiceClient();
  if (!db) return;

  await db.from("ai_interactions").insert({
    feature: params.feature,
    user_id: user.id,
    input_data: params.inputData,
    output_data: params.outputData,
    was_successful: params.wasSuccessful ?? true
  });
}
