import { NextResponse } from "next/server";
import { requireAdminStaff } from "@/lib/admin/require-staff";
import {
  adminUsersHasRolesColumn,
  adminUsersHasStaffProfileColumns,
  formatDeliveryWorkerOptionLabel,
  isDeliveryAssignableStaff
} from "@/lib/admin/staff";

/** List active delivery-capable staff for Ready for Shipping assignment UI. */
export async function GET() {
  const auth = await requireAdminStaff();
  if (!auth.ok) return auth.response;

  if (!(await adminUsersHasStaffProfileColumns(auth.ctx.db))) {
    return NextResponse.json(
      {
        error:
          "Staff profile columns are not available. Apply the admin_users staff profile migration first.",
        workers: []
      },
      { status: 503 }
    );
  }

  const hasRoles = await adminUsersHasRolesColumn(auth.ctx.db);
  const select = hasRoles
    ? "user_id, role, roles, display_name, phone, email, is_active"
    : "user_id, role, display_name, phone, email, is_active";

  const { data, error } = await auth.ctx.db
    .from("admin_users")
    .select(select)
    .eq("is_active", true)
    .order("display_name", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("[delivery-workers] list failed", error.message);
    return NextResponse.json({ error: "Unable to load delivery workers" }, { status: 500 });
  }

  type WorkerRow = {
    user_id: string;
    role?: string;
    roles?: unknown;
    display_name: string | null;
    phone: string | null;
    email: string | null;
    is_active: boolean;
  };

  const workers = ((data ?? []) as unknown as WorkerRow[])
    .filter((row) =>
      isDeliveryAssignableStaff({
        role: row.role,
        roles: row.roles,
        is_active: row.is_active
      })
    )
    .map((row) => {
      const displayName =
        (typeof row.display_name === "string" && row.display_name.trim()) ||
        (typeof row.email === "string" && row.email.trim()) ||
        (typeof row.phone === "string" && row.phone.trim()) ||
        "Delivery Staff";
      const phone =
        typeof row.phone === "string" && row.phone.trim() ? row.phone.trim() : null;
      const email =
        typeof row.email === "string" && row.email.trim() ? row.email.trim() : null;

      return {
        user_id: String(row.user_id),
        name: displayName,
        display_name: displayName,
        email,
        phone,
        label: formatDeliveryWorkerOptionLabel({
          display_name: displayName,
          phone,
          email
        })
      };
    });

  return NextResponse.json({ workers });
}
