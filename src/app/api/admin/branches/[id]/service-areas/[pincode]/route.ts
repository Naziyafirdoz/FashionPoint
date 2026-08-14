import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { resetBranchCache } from "@/lib/shipping/branch-store";

type RouteContext = { params: Promise<{ id: string; pincode: string }> };

export async function DELETE(_req: Request, { params }: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id, pincode } = await params;

  // Verify branch exists
  const { data: branch, error: branchError } = await auth.ctx.db
    .from("branches")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (branchError || !branch) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }

  // Verify service area exists
  const { data: area, error: areaError } = await auth.ctx.db
    .from("branch_service_areas")
    .select("id")
    .eq("branch_id", id)
    .eq("pincode", pincode)
    .maybeSingle();

  if (areaError || !area) {
    return NextResponse.json(
      { error: "Service area not found for this branch" },
      { status: 404 }
    );
  }

  // Delete the service area
  const { error: deleteError } = await auth.ctx.db
    .from("branch_service_areas")
    .delete()
    .eq("branch_id", id)
    .eq("pincode", pincode);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  resetBranchCache();
  return NextResponse.json({ success: true, branch_id: id, pincode });
}
