import { NextResponse } from "next/server";
import { findSize } from "@/lib/ai-size-finder";
import { logAiInteraction } from "@/lib/ai-interactions";

export async function POST(req: Request) {
  const body = await req.json();
  const input = body.input ?? body;
  const { bust, waist, shoulder, underbust, fitPreference } = input;
  const result = findSize({
    bust: Number(bust),
    waist: Number(waist),
    shoulder: Number(shoulder),
    underbust: underbust ? Number(underbust) : undefined,
    fitPreference:
      fitPreference === "fitted" || fitPreference === "regular" || fitPreference === "loose"
        ? fitPreference
        : undefined
  });

  await logAiInteraction({
    feature: "size_finder",
    inputData: input as Record<string, unknown>,
    outputData: result as unknown as Record<string, unknown>
  });

  return NextResponse.json(result);
}
