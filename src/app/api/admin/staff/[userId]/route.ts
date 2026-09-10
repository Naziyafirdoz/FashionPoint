import { NextResponse } from "next/server";
import type { StaffRole } from "@/lib/admin/require-staff";
import { requireAdminStaff } from "@/lib/admin/require-staff";
import {
  adminUsersHasRolesColumn,
  adminUsersHasStaffProfileColumns,
  findAuthUserIdByEmail,
  hasRole,
  mapStaffRow,
  normalizeStaffRolesInput,
  parseRolesFromRow,
  primaryStaffRole,
  resolveStaffRolesForWrite,
  STAFF_EMAIL_BELONGS_TO_OTHER_ACCOUNT,
  STAFF_EMAIL_BELONGS_TO_OTHER_ACCOUNT_CODE
} from "@/lib/admin/staff";

type RouteContext = { params: Promise<{ userId: string }> };

const STAFF_SELECT_BASE = "user_id, role, display_name, phone, email, is_active";
const STAFF_SELECT_WITH_ROLES = `${STAFF_SELECT_BASE}, roles`;

function roleWriteFields(roles: StaffRole[], includeRolesColumn: boolean) {
  if (includeRolesColumn) {
    return { roles, role: primaryStaffRole(roles) };
  }
  return { role: primaryStaffRole(roles) };
}

export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const auth = await requireAdminStaff();
    if (!auth.ok) return auth.response;

    if (!(await adminUsersHasStaffProfileColumns(auth.ctx.db))) {
      return NextResponse.json(
        {
          error:
            "Staff profile columns are not available. Apply the admin_users staff profile migration first."
        },
        { status: 503 }
      );
    }

    const { userId } = await params;
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const hasRolesCol = await adminUsersHasRolesColumn(auth.ctx.db);
    const select = hasRolesCol ? STAFF_SELECT_WITH_ROLES : STAFF_SELECT_BASE;

    const { data: existing, error: fetchError } = await auth.ctx.db
      .from("admin_users")
      .select(select)
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError) {
      console.error("[admin/staff] load failed", fetchError.message);
      return NextResponse.json(
        { error: fetchError.message || "Unable to load staff member" },
        { status: 500 }
      );
    }
    if (!existing) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const payload: Record<string, unknown> = {};
    const existingRoles = parseRolesFromRow(
      existing as unknown as Record<string, unknown>
    );
    const existingIsOwner = hasRole(existingRoles, "owner");

    if (typeof body.display_name === "string") {
      const displayName = body.display_name.trim();
      if (!displayName) {
        return NextResponse.json({ error: "Full name is required" }, { status: 400 });
      }
      payload.display_name = displayName;
    }

    if (typeof body.phone === "string") {
      payload.phone = body.phone.trim() || null;
    }

    let nextEmail: string | null = null;
    if (typeof body.email === "string") {
      const email = body.email.trim().toLowerCase();
      if (!email || !email.includes("@")) {
        return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
      }
      payload.email = email;
      nextEmail = email;
    }

    if (body.roles !== undefined || body.role !== undefined) {
      const rolesRaw =
        body.roles !== undefined
          ? body.roles
          : body.role !== undefined
            ? [body.role]
            : undefined;
      const requested = normalizeStaffRolesInput(rolesRaw);
      if (!requested) {
        return NextResponse.json(
          {
            error:
              "Select at least one valid role (owner, admin, worker, or delivery_worker)"
          },
          { status: 400 }
        );
      }

      const resolved = resolveStaffRolesForWrite({
        requested,
        existingRoles
      });
      if (!resolved.ok) {
        return NextResponse.json({ error: resolved.error }, { status: 400 });
      }

      // Owner must always retain owner; extra roles (e.g. Admin, Delivery Staff) are allowed.
      if (existingIsOwner && !hasRole(resolved.roles, "owner")) {
        return NextResponse.json(
          { error: "Owner role cannot be removed from Staff & Roles" },
          { status: 400 }
        );
      }

      Object.assign(payload, roleWriteFields(resolved.roles, hasRolesCol));
    }

    if (typeof body.is_active === "boolean") {
      if (userId === auth.ctx.userId && body.is_active === false) {
        return NextResponse.json(
          { error: "You cannot deactivate your own account" },
          { status: 400 }
        );
      }
      if (existingIsOwner && body.is_active === false) {
        return NextResponse.json(
          { error: "Owner account cannot be deactivated from Staff & Roles" },
          { status: 400 }
        );
      }
      payload.is_active = body.is_active;
    }

    const password =
      body.update_password === true &&
      typeof body.password === "string" &&
      body.password.trim()
        ? body.password.trim()
        : "";
    if (password && password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    if (Object.keys(payload).length === 0 && !password) {
      return NextResponse.json({ error: "No changes provided" }, { status: 400 });
    }

    let authEmail = "";
    if (nextEmail || password) {
      const { data: authUserData, error: authLookupError } =
        await auth.ctx.db.auth.admin.getUserById(userId);
      if (authLookupError) {
        console.error("[admin/staff] auth lookup failed", authLookupError.message);
        return NextResponse.json(
          { error: "Unable to load Auth user for this staff member" },
          { status: 400 }
        );
      }
      authEmail = (authUserData.user?.email ?? "").trim().toLowerCase();
    }

    const emailChanged = Boolean(nextEmail && nextEmail !== authEmail);
    const hasPassword = Boolean(password);
    const shouldUpdateAuth = emailChanged || hasPassword;

    console.log("[admin/staff] auth decision", {
      emailChanged,
      hasPassword
    });

    if (shouldUpdateAuth) {
      const authUpdate: {
        email?: string;
        password?: string;
        email_confirm?: boolean;
      } = {};

      if (emailChanged && nextEmail) {
        const otherAuthId = await findAuthUserIdByEmail(auth.ctx.db, nextEmail);
        if (otherAuthId === "lookup_failed") {
          return NextResponse.json(
            {
              error:
                "Unable to verify whether this email already has an account. Please try again."
            },
            { status: 503 }
          );
        }
        if (otherAuthId && otherAuthId !== userId) {
          console.info("[admin/staff] email update blocked: belongs to other Auth user", {
            staffUserId: userId,
            otherAuthId
          });
          return NextResponse.json(
            {
              error: STAFF_EMAIL_BELONGS_TO_OTHER_ACCOUNT,
              code: STAFF_EMAIL_BELONGS_TO_OTHER_ACCOUNT_CODE
            },
            { status: 409 }
          );
        }

        authUpdate.email = nextEmail;
        authUpdate.email_confirm = true;
      }
      if (hasPassword) {
        authUpdate.password = password;
      }

      if (authUpdate.email || authUpdate.password) {
        const { error: authError } = await auth.ctx.db.auth.admin.updateUserById(
          userId,
          authUpdate
        );
        if (authError) {
          console.error("[admin/staff] auth update failed", {
            message: authError.message,
            status: authError.status,
            name: authError.name,
            code: (authError as { code?: string }).code,
            emailChanged,
            hasPassword
          });
          return NextResponse.json(
            { error: "Unable to update login account" },
            { status: 400 }
          );
        }
      }
    }

    if (Object.keys(payload).length > 0) {
      const { data: updated, error: updateError } = await auth.ctx.db
        .from("admin_users")
        .update(payload)
        .eq("user_id", userId)
        .select(select)
        .maybeSingle();

      if (updateError) {
        console.error("[admin/staff] update failed", updateError.message);
        return NextResponse.json(
          { error: updateError.message || "Unable to update staff member" },
          { status: 500 }
        );
      }
      if (!updated) {
        return NextResponse.json(
          { error: "Staff member was not updated. It may have been removed." },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        staff: mapStaffRow(updated as unknown as Record<string, unknown>)
      });
    }

    const { data: refreshed } = await auth.ctx.db
      .from("admin_users")
      .select(select)
      .eq("user_id", userId)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      staff: mapStaffRow(
        (refreshed ?? existing) as unknown as Record<string, unknown>
      )
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[admin/staff] PATCH crashed", message);
    return NextResponse.json(
      { error: message || "Unexpected error while saving staff member" },
      { status: 500 }
    );
  }
}
