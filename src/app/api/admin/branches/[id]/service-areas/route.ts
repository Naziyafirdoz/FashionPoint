import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import type { BranchServiceAreaRecord } from "@/lib/shipping/branch-types";
import { resetBranchCache } from "@/lib/shipping/branch-store";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  // Verify branch exists
  const { data: branch, error: branchError } = await auth.ctx.db
    .from("branches")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (branchError || !branch) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }

  // Get service areas
  const { data: areas, error } = await auth.ctx.db
    .from("branch_service_areas")
    .select("*")
    .eq("branch_id", id)
    .order("pincode", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    branch_id: id,
    service_areas: (areas ?? []).map((a: BranchServiceAreaRecord) => ({
      id: a.id,
      branch_id: a.branch_id,
      pincode: a.pincode,
      is_local: Boolean(a.is_local)
    }))
  });
}

export async function POST(req: Request, { params }: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  // Verify branch exists
  const { data: branch, error: branchError } = await auth.ctx.db
    .from("branches")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (branchError || !branch) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));

  // Handle both single pincode (string) and multiple pincodes (array)
  let pincodes: string[] = [];

  if (Array.isArray(body.pincodes)) {
    pincodes = body.pincodes
      .map((p: unknown) => (typeof p === "string" ? p.trim() : ""))
      .filter((p: string) => p.length === 6 && /^\d{6}$/.test(p));
  } else if (typeof body.pincode === "string") {
    const p = body.pincode.trim();
    if (p.length === 6 && /^\d{6}$/.test(p)) {
      pincodes = [p];
    }
  }

  if (pincodes.length === 0) {
    return NextResponse.json(
      { error: "At least one valid 6-digit pincode is required" },
      { status: 400 }
    );
  }

  // Validate each pincode hasn't been added already
  const { data: existing } = await auth.ctx.db
    .from("branch_service_areas")
    .select("pincode")
    .eq("branch_id", id)
    .in("pincode", pincodes);

  const existingPincodes = new Set((existing ?? []).map((e: { pincode: string }) => e.pincode));
  const duplicateInBranch = pincodes.filter((p) => existingPincodes.has(p));

  if (duplicateInBranch.length > 0) {
    return NextResponse.json(
      {
        error: `Pincode(s) ${duplicateInBranch.join(", ")} already exist for this branch`
      },
      { status: 400 }
    );
  }

  // Insert new service areas
  const is_local = body.is_local !== false; // Default to true

  const rows = pincodes.map((pincode) => ({
    branch_id: id,
    pincode,
    is_local
  }));

  const { data, error } = await auth.ctx.db
    .from("branch_service_areas")
    .insert(rows)
    .select();

  if (error) {
    const message = error.message.includes("duplicate key")
      ? "One or more pincodes are already assigned to another branch"
      : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  resetBranchCache();

  return NextResponse.json(
    {
      branch_id: id,
      service_areas: (data ?? []).map((a: BranchServiceAreaRecord) => ({
        id: a.id,
        branch_id: a.branch_id,
        pincode: a.pincode,
        is_local: Boolean(a.is_local)
      }))
    },
    { status: 201 }
  );
}
