import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import {
  createAdminOffer,
  isAdminOfferStatus,
  listAdminOffers,
  parseOfferUpsertInput
} from "@/lib/admin/offers";

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status");
  if (statusParam && !isAdminOfferStatus(statusParam)) {
    return NextResponse.json(
      { error: "status must be disabled, scheduled, active, or expired" },
      { status: 400 }
    );
  }

  const result = await listAdminOffers(auth.ctx.db, {
    status: statusParam && isAdminOfferStatus(statusParam) ? statusParam : undefined
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ offers: result.offers });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = parseOfferUpsertInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const result = await createAdminOffer(auth.ctx.db, parsed.input);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ offer: result.offer }, { status: 201 });
}
