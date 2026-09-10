import type { SupabaseClient } from "@supabase/supabase-js";
import type { StaffRole } from "@/lib/admin/require-staff";

/** All canonical staff roles (UI + DB). */
export const ALL_STAFF_ROLES = [
  "owner",
  "admin",
  "worker",
  "delivery_worker"
] as const satisfies readonly StaffRole[];

/** Roles assignable on Add Staff (Owner grant is restricted server-side). */
export const ASSIGNABLE_STAFF_ROLES = ["admin", "worker", "delivery_worker"] as const;

export type AssignableStaffRole = (typeof ASSIGNABLE_STAFF_ROLES)[number];

export type StaffMemberRow = {
  user_id: string;
  /** Highest-privilege role for backward-compatible display/sort. */
  role: StaffRole;
  /** Full multi-role set (source of truth). */
  roles: StaffRole[];
  display_name: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
};

const ROLE_SET = new Set<string>(ALL_STAFF_ROLES);

export function isStaffRole(value: unknown): value is StaffRole {
  return typeof value === "string" && ROLE_SET.has(value);
}

export function isAssignableStaffRole(value: unknown): value is AssignableStaffRole {
  return value === "admin" || value === "worker" || value === "delivery_worker";
}

/** Privilege order for primary/legacy role column sync. */
export function primaryStaffRole(roles: StaffRole[]): StaffRole {
  if (roles.includes("owner")) return "owner";
  if (roles.includes("admin")) return "admin";
  if (roles.includes("worker")) return "worker";
  if (roles.includes("delivery_worker")) return "delivery_worker";
  return "admin";
}

export function hasRole(
  roles: StaffRole[] | null | undefined,
  role: StaffRole
): boolean {
  return Array.isArray(roles) && roles.includes(role);
}

export function hasAnyRole(
  roles: StaffRole[] | null | undefined,
  allowed: StaffRole[]
): boolean {
  if (!Array.isArray(roles) || roles.length === 0) return false;
  return allowed.some((role) => roles.includes(role));
}

export function isOwnerOrAdmin(roles: StaffRole[] | null | undefined): boolean {
  return hasAnyRole(roles, ["owner", "admin"]);
}

/**
 * Packing-only restriction: has worker, without owner/admin elevation.
 * Multi-role e.g. worker+delivery_worker stays scoped to assigned packing orders.
 */
export function isAssignedPackingWorkerOnly(
  roles: StaffRole[] | null | undefined
): boolean {
  return hasRole(roles, "worker") && !isOwnerOrAdmin(roles);
}

/**
 * Resolve roles for create/update.
 * - Never invent roles; only canonical values (caller must normalize first).
 * - Preserve owner forever when the row already has owner.
 * - Reject promoting a non-owner to owner (single-owner policy).
 */
export function resolveStaffRolesForWrite(opts: {
  requested: StaffRole[];
  existingRoles: StaffRole[];
}): { ok: true; roles: StaffRole[] } | { ok: false; error: string } {
  const requested = [...opts.requested];
  const existingHasOwner = hasRole(opts.existingRoles, "owner");
  const requestedHasOwner = hasRole(requested, "owner");

  if (!existingHasOwner && requestedHasOwner) {
    return {
      ok: false,
      error:
        "Owner role cannot be assigned from Staff & Roles. Only the existing Owner account may keep the Owner role."
    };
  }

  let roles: StaffRole[] = requested.filter((role) => role !== "owner");
  if (existingHasOwner) {
    roles = ["owner", ...roles.filter((role) => role !== "owner")];
  }

  if (roles.length === 0) {
    return { ok: false, error: "At least one role is required" };
  }

  return { ok: true, roles };
}

/**
 * Normalize unknown client/DB role input into a deduped canonical roles array.
 * Returns null when invalid or empty after filtering.
 */
export function normalizeStaffRolesInput(raw: unknown): StaffRole[] | null {
  const values: unknown[] = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? [raw]
      : [];

  const out: StaffRole[] = [];
  for (const value of values) {
    if (typeof value !== "string") continue;
    const role = value.trim().toLowerCase();
    if (!isStaffRole(role)) return null;
    if (!out.includes(role)) out.push(role);
  }
  return out.length > 0 ? out : null;
}

/** Read roles from a DB row; fall back to legacy single `role`. */
export function parseRolesFromRow(row: {
  roles?: unknown;
  role?: unknown;
}): StaffRole[] {
  const fromArray = normalizeStaffRolesInput(row.roles);
  if (fromArray) return fromArray;
  const legacy = normalizeStaffRolesInput(row.role);
  return legacy ?? ["admin"];
}

export function staffRoleLabel(role: string): string {
  switch (role) {
    case "owner":
      return "Owner";
    case "admin":
      return "Admin";
    case "worker":
      return "Worker";
    case "delivery_worker":
      return "Delivery Staff";
    default:
      return role;
  }
}

export function formatRolesLabel(roles: StaffRole[]): string {
  return roles.map(staffRoleLabel).join(", ");
}

export function formatDeliveryWorkerOptionLabel(worker: {
  name?: string | null;
  display_name?: string | null;
  phone?: string | null;
  email?: string | null;
}): string {
  const name =
    worker.display_name?.trim() ||
    worker.name?.trim() ||
    worker.email?.trim() ||
    worker.phone?.trim() ||
    "Delivery Staff";
  const phone = worker.phone?.trim() || "";
  return phone ? `${name} — ${phone}` : name;
}

/** True when Staff & Roles profile columns exist (migration applied). */
export async function adminUsersHasStaffProfileColumns(
  db: SupabaseClient
): Promise<boolean> {
  const { error } = await db
    .from("admin_users")
    .select("display_name, phone, email, is_active")
    .limit(0);
  return !error;
}

export async function adminUsersHasRolesColumn(
  db: SupabaseClient
): Promise<boolean> {
  const { error } = await db.from("admin_users").select("roles").limit(0);
  return !error;
}

/** Delivery-assignable when active and roles include delivery_worker. */
export function isDeliveryAssignableStaff(row: {
  role?: string | null;
  roles?: unknown;
  is_active?: boolean | null;
}): boolean {
  if (row.is_active === false) return false;
  const roles = parseRolesFromRow(row);
  return hasRole(roles, "delivery_worker");
}

export function mapStaffRow(row: Record<string, unknown>): StaffMemberRow {
  const roles = parseRolesFromRow(row);
  const role = primaryStaffRole(roles);
  return {
    user_id: String(row.user_id),
    role,
    roles,
    display_name:
      typeof row.display_name === "string" && row.display_name.trim()
        ? row.display_name.trim()
        : null,
    phone: typeof row.phone === "string" && row.phone.trim() ? row.phone.trim() : null,
    email: typeof row.email === "string" && row.email.trim() ? row.email.trim() : null,
    is_active: row.is_active !== false
  };
}

/** Edit Staff tried to take another Auth user's email (cannot merge identities). */
export const STAFF_EMAIL_BELONGS_TO_OTHER_ACCOUNT =
  "This email belongs to another existing account. To grant that person staff or delivery access, add or edit their Staff & Roles entry instead of changing this login email.";

export const STAFF_EMAIL_BELONGS_TO_OTHER_ACCOUNT_CODE =
  "EMAIL_BELONGS_TO_OTHER_ACCOUNT" as const;

/**
 * Resolve Auth user id for a normalized email via Auth Admin listUsers.
 * Returns null if unused, or "lookup_failed" if Auth listing fails.
 */
export async function findAuthUserIdByEmail(
  db: SupabaseClient,
  email: string
): Promise<string | null | "lookup_failed"> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const perPage = 200;
  const maxPages = 25;
  for (let page = 1; page <= maxPages; page += 1) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("[admin/staff] auth email lookup failed", error.message);
      return "lookup_failed";
    }
    const users = data.users ?? [];
    const match = users.find(
      (user) => (user.email ?? "").trim().toLowerCase() === normalized
    );
    if (match) return match.id;
    if (users.length < perPage) break;
  }
  return null;
}
