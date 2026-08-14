import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import {
  listAdminBranches,
  normalizeBranchInput,
  validateBranchSlug
} from "@/lib/admin/branches";
import { resetBranchCache } from "@/lib/shipping/branch-store";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const branches = await listAdminBranches(auth.ctx.db);
  return NextResponse.json({ branches });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const input = normalizeBranchInput(body);
  if (!input) {
    return NextResponse.json(
      { error: "Invalid branch data. Check name, slug, city, and charges." },
      { status: 400 }
    );
  }

  // If setting as default, unset other defaults
  let updates: Record<string, unknown> = {};
  if (input.is_default) {
    await auth.ctx.db
      .from("branches")
      .update({ is_default: false })
      .eq("is_default", true)
      .neq("id", "");
    updates.is_default = true;
  }

  const { data, error } = await auth.ctx.db
    .from("branches")
    .insert({
      name: input.name,
      slug: input.slug,
      city: input.city,
      state: input.state ?? "",
      pincode: input.pincode ?? "",
      address: input.address ?? null,
      phone: input.phone ?? null,
      local_shipping_charge: input.local_shipping_charge,
      outstation_shipping_charge: input.outstation_shipping_charge,
      is_active: input.is_active ?? true,
      is_default: input.is_default ?? false,
      sort_order: input.sort_order ?? 0
    })
    .select()
    .single();

  if (error) {
    const message =
      error.code === "23505"
        ? error.message.includes("slug")
          ? "A branch with this slug already exists"
          : error.message
        : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  resetBranchCache();
  return NextResponse.json({ branch: data }, { status: 201 });
}
