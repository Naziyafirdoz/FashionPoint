import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import {
  createAdminCampaign,
  isAdminCampaignStatus,
  listAdminCampaigns,
  parseCampaignUpsertInput
} from "@/lib/admin/campaigns";
import { HOMEPAGE_HERO_CAMPAIGN_CACHE_TAG } from "@/lib/campaigns/homepage-hero-campaigns";

function revalidateHomepageHeroCampaign() {
  revalidateTag(HOMEPAGE_HERO_CAMPAIGN_CACHE_TAG);
  revalidatePath("/", "layout");
  revalidatePath("/admin/campaigns");
}

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status");
  if (statusParam && !isAdminCampaignStatus(statusParam)) {
    return NextResponse.json(
      { error: "status must be disabled, scheduled, active, or expired" },
      { status: 400 }
    );
  }

  const result = await listAdminCampaigns(auth.ctx.db, {
    status: statusParam && isAdminCampaignStatus(statusParam) ? statusParam : undefined
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ campaigns: result.campaigns });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = parseCampaignUpsertInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const result = await createAdminCampaign(auth.ctx.db, parsed.input);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  revalidateHomepageHeroCampaign();
  return NextResponse.json({ campaign: result.campaign }, { status: 201 });
}
