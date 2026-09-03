import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import {
  deleteAdminCampaign,
  getAdminCampaign,
  parseCampaignUpsertInput,
  updateAdminCampaign
} from "@/lib/admin/campaigns";
import { HOMEPAGE_HERO_CAMPAIGN_CACHE_TAG } from "@/lib/campaigns/homepage-hero-campaigns";

type RouteContext = { params: Promise<{ id: string }> };

function revalidateHomepageHeroCampaign() {
  revalidateTag(HOMEPAGE_HERO_CAMPAIGN_CACHE_TAG);
  revalidatePath("/", "layout");
  revalidatePath("/admin/campaigns");
}

export async function GET(_req: Request, { params }: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const result = await getAdminCampaign(auth.ctx.db, id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ campaign: result.campaign });
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = parseCampaignUpsertInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const result = await updateAdminCampaign(auth.ctx.db, id, parsed.input);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  revalidateHomepageHeroCampaign();
  return NextResponse.json({ campaign: result.campaign });
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const result = await deleteAdminCampaign(auth.ctx.db, id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  revalidateHomepageHeroCampaign();
  return NextResponse.json({ success: true });
}
