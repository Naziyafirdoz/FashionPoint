import { NextResponse } from "next/server";
import { requireAdminStaff } from "@/lib/admin/require-staff";
import { computeAiAnalytics } from "@/lib/ai/analytics";
import type { AiInteraction } from "@/types";

export async function GET() {
  const auth = await requireAdminStaff();
  if (!auth.ok) return auth.response;

  const limit = 500;
  let page = 0;
  let all: AiInteraction[] = [];
  let hasMore = true;

  while (hasMore) {
    const from = page * limit;
    const to = from + limit - 1;
    const { data, error } = await auth.ctx.db
      .from("ai_interactions")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      return NextResponse.json({ error: "Unable to load AI analytics" }, { status: 500 });
    }

    const batch = (data ?? []) as AiInteraction[];
    all = all.concat(batch);
    hasMore = batch.length === limit;
    page += 1;
  }

  const productIds = new Set<string>();
  for (const row of all) {
    if (row.feature !== "style_assistant" || !row.output_data) continue;
    const output = row.output_data;
    const recommendations = output.recommendations;
    if (Array.isArray(recommendations)) {
      for (const rec of recommendations) {
        if (rec && typeof rec === "object" && typeof (rec as { productId?: string }).productId === "string") {
          productIds.add((rec as { productId: string }).productId);
        }
      }
    }
    const ids = output.productIds;
    if (Array.isArray(ids)) {
      for (const id of ids) {
        if (typeof id === "string") productIds.add(id);
      }
    }
  }

  const productNames = new Map<string, { name: string; image?: string }>();
  if (productIds.size > 0) {
    const { data: products } = await auth.ctx.db
      .from("products")
      .select("id, name, images")
      .in("id", [...productIds]);

    for (const product of products ?? []) {
      const images = product.images as string[] | null;
      productNames.set(product.id as string, {
        name: product.name as string,
        image: images?.[0]
      });
    }
  }

  const analytics = computeAiAnalytics(all, productNames);

  return NextResponse.json({ analytics });
}
