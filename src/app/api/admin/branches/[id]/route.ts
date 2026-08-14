import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import {
  getAdminBranchDetail,
  normalizeBranchInput
} from "@/lib/admin/branches";
import { resetBranchCache } from "@/lib/shipping/branch-store";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const branch = await getAdminBranchDetail(auth.ctx.db, id);

  if (!branch) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }

  return NextResponse.json({ branch });
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  // Fetch current branch first
  const { data: current, error: fetchError } = await auth.ctx.db
    .from("branches")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !current) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));

  // Build update payload with validation
  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    if (name.length > 100) return NextResponse.json({ error: "Name too long" }, { status: 400 });
    updates.name = name;
  }

  if (body.slug !== undefined) {
    const slug = String(body.slug).trim().toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return NextResponse.json({ error: "Invalid slug format" }, { status: 400 });
    }
    if (slug !== current.slug) {
      // Check if new slug is unique
      const { data: existing } = await auth.ctx.db
        .from("branches")
        .select("id")
        .eq("slug", slug)
        .neq("id", id)
        .maybeSingle();
      if (existing) {
        return NextResponse.json({ error: "Slug already exists" }, { status: 400 });
      }
    }
    updates.slug = slug;
  }

  if (body.city !== undefined) {
    const city = String(body.city).trim();
    if (!city) return NextResponse.json({ error: "City is required" }, { status: 400 });
    if (city.length > 50) return NextResponse.json({ error: "City too long" }, { status: 400 });
    updates.city = city;
  }

  if (body.state !== undefined) {
    const state = body.state ? String(body.state).trim() : "";
    if (state.length > 50) return NextResponse.json({ error: "State too long" }, { status: 400 });
    updates.state = state;
  }

  if (body.pincode !== undefined) {
    const pincode = body.pincode ? String(body.pincode).trim() : "";
    if (pincode && !/^\d{6}$/.test(pincode)) {
      return NextResponse.json({ error: "Pincode must be 6 digits" }, { status: 400 });
    }
    updates.pincode = pincode;
  }

  if (body.address !== undefined) {
    const address = body.address ? String(body.address).trim() : null;
    if (address && address.length > 500) {
      return NextResponse.json({ error: "Address too long" }, { status: 400 });
    }
    updates.address = address;
  }

  if (body.phone !== undefined) {
    const phone = body.phone ? String(body.phone).trim() : null;
    if (phone && !/^\+?[0-9\s-()]{7,15}$/.test(phone)) {
      return NextResponse.json({ error: "Invalid phone format" }, { status: 400 });
    }
    updates.phone = phone;
  }

  if (body.local_shipping_charge !== undefined) {
    const charge = Number(body.local_shipping_charge);
    if (isNaN(charge) || charge < 0) {
      return NextResponse.json({ error: "Local charge must be non-negative" }, { status: 400 });
    }
    updates.local_shipping_charge = charge;
  }

  if (body.outstation_shipping_charge !== undefined) {
    const charge = Number(body.outstation_shipping_charge);
    if (isNaN(charge) || charge < 0) {
      return NextResponse.json({ error: "Outstation charge must be non-negative" }, { status: 400 });
    }
    updates.outstation_shipping_charge = charge;
  }

  if (body.is_active !== undefined) {
    updates.is_active = Boolean(body.is_active);
  }

  if (body.is_default !== undefined) {
    if (body.is_default && !current.is_default) {
      // Setting as default: unset other defaults
      await auth.ctx.db
        .from("branches")
        .update({ is_default: false })
        .eq("is_default", true)
        .neq("id", id);
      updates.is_default = true;
    } else if (!body.is_default && current.is_default) {
      // Only allow unsetting default if there's another default or if we're accepting "no default" state
      const { data: otherDefaults } = await auth.ctx.db
        .from("branches")
        .select("id")
        .eq("is_default", true)
        .neq("id", id)
        .limit(1);

      if (!otherDefaults || otherDefaults.length === 0) {
        return NextResponse.json(
          { error: "At least one branch must be default" },
          { status: 400 }
        );
      }
      updates.is_default = false;
    }
  }

  if (body.sort_order !== undefined) {
    const order = Number(body.sort_order);
    if (isNaN(order) || order < 0) {
      return NextResponse.json({ error: "Sort order must be non-negative" }, { status: 400 });
    }
    updates.sort_order = order;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const { data, error: updateError } = await auth.ctx.db
    .from("branches")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  resetBranchCache();
  return NextResponse.json({ branch: data });
}
