import { NextResponse } from "next/server";
import {
  listBackInStockRequests,
  updateBackInStockRequestStatus,
  type BackInStockRequestStatus
} from "@/lib/admin/back-in-stock-requests";
import { requireAdminStaff } from "@/lib/admin/require-staff";
import { cancelBackInStockRequestManually } from "@/lib/stock-notifications/manual-cancel";

export async function GET(req: Request) {
  const auth = await requireAdminStaff();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? undefined;
  const status = (searchParams.get("status") ?? "all") as BackInStockRequestStatus | "all";
  const sort = (searchParams.get("sort") ?? "newest") as
    | "newest"
    | "oldest"
    | "product"
    | "customer";
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = Number.parseInt(searchParams.get("pageSize") ?? "15", 10);

  try {
    const result = await listBackInStockRequests(auth.ctx.db, {
      search,
      status,
      sort,
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 15
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Unable to load back-in-stock requests." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = await requireAdminStaff();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  const status = body.status as BackInStockRequestStatus;

  if (!id || !["pending", "sent", "cancelled"].includes(status)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (status === "cancelled") {
    const result = await cancelBackInStockRequestManually(auth.ctx.db, id);
    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const result = await updateBackInStockRequestStatus(auth.ctx.db, id, status);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
