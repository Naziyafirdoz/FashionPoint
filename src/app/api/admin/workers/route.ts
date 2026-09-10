import { NextResponse } from "next/server";
import { requireAdminStaff } from "@/lib/admin/require-staff";
import {
  adminUsersHasRolesColumn,
  hasRole,
  parseRolesFromRow
} from "@/lib/admin/staff";

/** List packing-capable staff (roles include worker). */
export async function GET() {
  const auth = await requireAdminStaff();
  if (!auth.ok) return auth.response;

  const hasRoles = await adminUsersHasRolesColumn(auth.ctx.db);

  if (hasRoles) {
    const { data, error } = await auth.ctx.db
      .from("admin_users")
      .select("user_id, role, roles")
      .contains("roles", ["worker"]);

    if (error) {
      return NextResponse.json({ error: "Unable to load workers" }, { status: 500 });
    }

    const workers = (data ?? [])
      .filter((row) => hasRole(parseRolesFromRow(row as Record<string, unknown>), "worker"))
      .map((row) => ({
        user_id: String((row as { user_id: string }).user_id),
        role: "worker"
      }));

    return NextResponse.json({ workers });
  }

  const { data, error } = await auth.ctx.db
    .from("admin_users")
    .select("user_id, role")
    .eq("role", "worker");

  if (error) {
    return NextResponse.json({ error: "Unable to load workers" }, { status: 500 });
  }

  return NextResponse.json({ workers: data ?? [] });
}
