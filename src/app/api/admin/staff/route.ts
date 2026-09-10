import { NextResponse } from "next/server";
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
  type StaffMemberRow
} from "@/lib/admin/staff";

const STAFF_SELECT_BASE = "user_id, role, display_name, phone, email, is_active";
const STAFF_SELECT_WITH_ROLES = `${STAFF_SELECT_BASE}, roles`;

async function staffSelect(db: Parameters<typeof adminUsersHasRolesColumn>[0]) {
  return (await adminUsersHasRolesColumn(db))
    ? STAFF_SELECT_WITH_ROLES
    : STAFF_SELECT_BASE;
}

function rolesWritePayload(roles: import("@/lib/admin/require-staff").StaffRole[]) {
  return {
    roles,
    role: primaryStaffRole(roles)
  };
}

export async function GET() {
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

  const select = await staffSelect(auth.ctx.db);
  const { data, error } = await auth.ctx.db
    .from("admin_users")
    .select(select)
    .order("display_name", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("[admin/staff] list failed", error.message);
    return NextResponse.json({ error: "Unable to load staff" }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  const incompleteIds = rows
    .filter((row) => {
      const emailMissing = !String(row.email ?? "").trim();
      const nameMissing = !String(row.display_name ?? "").trim();
      return emailMissing || nameMissing;
    })
    .map((row) => String(row.user_id));

  // Legacy rows may have NULL profile fields — fill from Auth (no duplicate Auth users).
  const authProfileByUserId = new Map<
    string,
    { email?: string; display_name?: string }
  >();
  if (incompleteIds.length > 0) {
    await Promise.all(
      incompleteIds.map(async (userId) => {
        const { data: authUserData, error: authLookupError } =
          await auth.ctx.db.auth.admin.getUserById(userId);
        if (authLookupError) {
          console.warn(
            "[admin/staff] auth profile lookup skipped",
            userId,
            authLookupError.message
          );
          return;
        }
        const user = authUserData.user;
        if (!user) return;
        const email = (user.email ?? "").trim().toLowerCase();
        const meta = user.user_metadata as Record<string, unknown> | undefined;
        const displayName =
          (typeof meta?.full_name === "string" && meta.full_name.trim()) ||
          (typeof meta?.name === "string" && meta.name.trim()) ||
          "";
        authProfileByUserId.set(userId, {
          ...(email ? { email } : {}),
          ...(displayName ? { display_name: displayName } : {})
        });
      })
    );
  }

  const staff: StaffMemberRow[] = rows.map((row) => {
    const mapped = mapStaffRow(row);
    const authProfile = authProfileByUserId.get(mapped.user_id);
    if (!authProfile) return mapped;
    return {
      ...mapped,
      email: mapped.email || authProfile.email || null,
      display_name: mapped.display_name || authProfile.display_name || null
    };
  });

  return NextResponse.json({ staff });
}

export async function POST(req: Request) {
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

    const hasRolesCol = await adminUsersHasRolesColumn(auth.ctx.db);
    const select = hasRolesCol ? STAFF_SELECT_WITH_ROLES : STAFF_SELECT_BASE;

    const body = await req.json().catch(() => ({}));
    const displayName =
      typeof body.display_name === "string" ? body.display_name.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password =
      typeof body.password === "string" ? body.password.trim() : "";
    const isActive = body.is_active !== false;

    // Prefer roles[]; accept legacy single role for older clients.
    const rolesRaw =
      body.roles !== undefined
        ? body.roles
        : body.role !== undefined
          ? [body.role]
          : undefined;
    const requestedRoles = normalizeStaffRolesInput(rolesRaw);

    if (!displayName) {
      return NextResponse.json({ error: "Full name is required" }, { status: 400 });
    }
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    }
    if (!requestedRoles) {
      return NextResponse.json(
        {
          error:
            "Select at least one valid role (owner, admin, worker, or delivery_worker)"
        },
        { status: 400 }
      );
    }

    const existingAuthId = await findAuthUserIdByEmail(auth.ctx.db, email);
    if (existingAuthId === "lookup_failed") {
      return NextResponse.json(
        {
          error:
            "Unable to verify whether this email already has an account. Please try again."
        },
        { status: 503 }
      );
    }

    let userId: string;
    let createdNewAuth = false;

    const upsertStaff = async (
      targetUserId: string,
      existingRoles: ReturnType<typeof parseRolesFromRow>
    ) => {
      const resolved = resolveStaffRolesForWrite({
        requested: requestedRoles,
        existingRoles
      });
      if (!resolved.ok) {
        return { errorResponse: NextResponse.json({ error: resolved.error }, { status: 400 }) };
      }

      const rolePayload = hasRolesCol
        ? rolesWritePayload(resolved.roles)
        : { role: primaryStaffRole(resolved.roles) };

      const { data: row, error: upsertError } = await auth.ctx.db
        .from("admin_users")
        .upsert(
          {
            user_id: targetUserId,
            ...rolePayload,
            display_name: displayName,
            phone: phone || null,
            email,
            is_active: isActive
          },
          { onConflict: "user_id" }
        )
        .select(select)
        .maybeSingle();

      if (upsertError || !row) {
        console.error("[admin/staff] admin_users upsert failed", upsertError?.message);
        return {
          errorResponse: NextResponse.json(
            { error: upsertError?.message || "Unable to save staff member" },
            { status: 500 }
          )
        };
      }

      return {
        row: row as unknown as Record<string, unknown>,
        roles: resolved.roles
      };
    };

    if (existingAuthId) {
      userId = existingAuthId;
      if (password) {
        if (password.length < 6) {
          return NextResponse.json(
            { error: "Password must be at least 6 characters" },
            { status: 400 }
          );
        }
        const { error: passwordError } = await auth.ctx.db.auth.admin.updateUserById(
          userId,
          { password }
        );
        if (passwordError) {
          console.error(
            "[admin/staff] existing-auth password update failed",
            passwordError.message
          );
          return NextResponse.json(
            { error: "Unable to update login password for this account" },
            { status: 400 }
          );
        }
      }

      const { data: existingStaff } = await auth.ctx.db
        .from("admin_users")
        .select(select)
        .eq("user_id", userId)
        .maybeSingle();

      const existingRoles = existingStaff
        ? parseRolesFromRow(existingStaff as unknown as Record<string, unknown>)
        : [];

      const result = await upsertStaff(userId, existingRoles);
      if ("errorResponse" in result && result.errorResponse) return result.errorResponse;

      console.info("[admin/staff] reused Auth identity for staff capability", {
        userId,
        roles: result.roles
      });

      return NextResponse.json({
        success: true,
        reused_existing_auth: true,
        staff: mapStaffRow(result.row!)
      });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters for a new staff login" },
        { status: 400 }
      );
    }

    // Block creating a brand-new Auth user as Owner.
    if (hasRole(requestedRoles, "owner")) {
      return NextResponse.json(
        {
          error:
            "Owner role cannot be assigned from Staff & Roles. Only the existing Owner account may keep the Owner role."
        },
        { status: 400 }
      );
    }

    const { data: created, error: createError } = await auth.ctx.db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: displayName, phone: phone || null }
    });

    if (createError || !created.user) {
      console.error("[admin/staff] auth create failed", createError?.message);
      const racedId = await findAuthUserIdByEmail(auth.ctx.db, email);
      if (racedId && racedId !== "lookup_failed") {
        userId = racedId;
      } else {
        return NextResponse.json(
          {
            error: createError?.message ?? "Unable to create login account"
          },
          { status: 400 }
        );
      }
    } else {
      userId = created.user.id;
      createdNewAuth = true;
    }

    const { data: existingStaff } = await auth.ctx.db
      .from("admin_users")
      .select(select)
      .eq("user_id", userId)
      .maybeSingle();

    const existingRoles = existingStaff
      ? parseRolesFromRow(existingStaff as unknown as Record<string, unknown>)
      : [];

    const result = await upsertStaff(userId, existingRoles);
    if ("errorResponse" in result && result.errorResponse) {
      if (createdNewAuth) {
        try {
          await auth.ctx.db.auth.admin.deleteUser(userId);
        } catch (cleanupErr) {
          console.error("[admin/staff] auth cleanup failed", cleanupErr);
        }
      }
      return result.errorResponse;
    }

    return NextResponse.json({
      success: true,
      reused_existing_auth: false,
      staff: mapStaffRow(result.row!)
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[admin/staff] POST crashed", message);
    return NextResponse.json(
      { error: message || "Unexpected error while creating staff member" },
      { status: 500 }
    );
  }
}
