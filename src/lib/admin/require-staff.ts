import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  hasAnyRole,
  hasRole,
  parseRolesFromRow,
  primaryStaffRole,
  type StaffMemberRow
} from "@/lib/admin/staff";

export type StaffRole = "owner" | "admin" | "worker" | "delivery_worker";

export type StaffContext = {
  db: SupabaseClient;
  userId: string;
  /** Full multi-role set (source of truth). */
  roles: StaffRole[];
  /**
   * Highest-privilege role for backward-compatible callers that still read ctx.role.
   * Prefer hasRole(ctx.roles, ...) for new checks.
   */
  role: StaffRole;
  /** True when roles include delivery_worker. */
  canDeliver: boolean;
};

async function loadStaffRow(
  db: SupabaseClient,
  userId: string
): Promise<{ user_id: string; role?: string; roles?: unknown } | null> {
  const withRoles = await db
    .from("admin_users")
    .select("user_id, role, roles")
    .eq("user_id", userId)
    .maybeSingle();

  if (!withRoles.error) {
    return withRoles.data as {
      user_id: string;
      role?: string;
      roles?: unknown;
    } | null;
  }

  // roles column missing — fall back to legacy single role.
  const legacy = await db
    .from("admin_users")
    .select("user_id, role")
    .eq("user_id", userId)
    .maybeSingle();

  if (legacy.error || !legacy.data) return null;
  return legacy.data as { user_id: string; role?: string };
}

function contextFromRow(
  db: SupabaseClient,
  staff: { user_id: string; role?: string; roles?: unknown }
): StaffContext {
  const roles = parseRolesFromRow(staff) as StaffRole[];
  const role = primaryStaffRole(roles);
  return {
    db,
    userId: staff.user_id,
    roles,
    role,
    canDeliver: hasRole(roles, "delivery_worker")
  };
}

export async function requireStaff(
  allowedRoles: StaffRole[] = ["owner", "admin", "worker"]
): Promise<{ ok: true; ctx: StaffContext } | { ok: false; response: NextResponse }> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const db = createServiceClient();
  if (!db) {
    return { ok: false, response: NextResponse.json({ error: "DB not configured" }, { status: 503 }) };
  }

  const staff = await loadStaffRow(db, user.id);
  if (!staff) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const ctx = contextFromRow(db, staff);
  if (!hasAnyRole(ctx.roles, allowedRoles)) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { ok: true, ctx };
}

export async function requireAdminStaff(): Promise<
  { ok: true; ctx: StaffContext } | { ok: false; response: NextResponse }
> {
  return requireStaff(["owner", "admin"]);
}

/** Packing staff (not delivery-only). */
export async function requireWorkerStaff(): Promise<
  { ok: true; ctx: StaffContext } | { ok: false; response: NextResponse }
> {
  return requireStaff(["owner", "admin", "worker"]);
}

/**
 * Delivery staff dashboard access:
 * owner / admin / anyone with delivery_worker in roles.
 */
export async function requireDeliveryStaff(): Promise<
  { ok: true; ctx: StaffContext } | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const db = createServiceClient();
  if (!db) {
    return { ok: false, response: NextResponse.json({ error: "DB not configured" }, { status: 503 }) };
  }

  const staff = await loadStaffRow(db, user.id);
  if (!staff) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const ctx = contextFromRow(db, staff);
  const allowed =
    hasAnyRole(ctx.roles, ["owner", "admin", "delivery_worker"]) || ctx.canDeliver;

  if (!allowed) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { ok: true, ctx };
}

/** @deprecated Prefer hasRole from @/lib/admin/staff */
export function normalizeStaffRole(raw: string | null | undefined): StaffRole {
  const role = (raw ?? "admin").toLowerCase() as StaffRole;
  if (
    role === "owner" ||
    role === "admin" ||
    role === "worker" ||
    role === "delivery_worker"
  ) {
    return role;
  }
  return "admin";
}

/** Type-only re-export convenience for callers mapping staff rows. */
export type { StaffMemberRow };
