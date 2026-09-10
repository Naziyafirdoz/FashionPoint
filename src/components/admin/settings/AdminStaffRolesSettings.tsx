"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Users } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SettingsSection } from "./settings-shared";
import { StaffFormModal } from "./StaffFormModal";
import {
  STAFF_EMAIL_BELONGS_TO_OTHER_ACCOUNT_CODE,
  formatRolesLabel,
  hasRole,
  type StaffMemberRow
} from "@/lib/admin/staff";
import type { StaffRole } from "@/lib/admin/require-staff";

const EMAIL_TRANSFER_BLOCKED_MESSAGE =
  "This email is already linked to another account. Staff login emails cannot be transferred between accounts.";

const actionBtnClass =
  "!h-7 !min-h-0 !rounded-lg !px-2.5 !py-0 text-xs font-medium leading-none";

function StaffActions({
  row,
  togglingId,
  onEdit,
  onToggle
}: {
  row: StaffMemberRow;
  togglingId: string | null;
  onEdit: () => void;
  onToggle: () => void;
}) {
  const isDeactivate = row.is_active;
  const isOwner = hasRole(row.roles, "owner") || row.role === "owner";
  return (
    <div className="flex flex-row flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        className={actionBtnClass}
        onClick={onEdit}
      >
        Edit
      </Button>
      <Button
        type="button"
        variant="outline"
        className={`${actionBtnClass} ${
          isDeactivate
            ? "border-red-300 text-red-700 hover:border-red-400 hover:bg-red-50 hover:text-red-800"
            : ""
        }`}
        disabled={togglingId === row.user_id || isOwner}
        onClick={onToggle}
      >
        {togglingId === row.user_id
          ? "…"
          : isDeactivate
            ? "Deactivate"
            : "Activate"}
      </Button>
    </div>
  );
}

function rolesDisplay(row: StaffMemberRow): string {
  const roles =
    Array.isArray(row.roles) && row.roles.length > 0
      ? row.roles
      : ([row.role] as StaffRole[]);
  return formatRolesLabel(roles);
}

export function AdminStaffRolesSettings() {
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffMemberRow[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StaffMemberRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/staff", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to load staff");
        setStaff([]);
        return;
      }
      setStaff((data.staff as StaffMemberRow[]) ?? []);
    } catch {
      toast.error("Failed to load staff");
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  const saveStaff = async (values: {
    display_name: string;
    phone: string;
    email: string;
    password: string;
    update_password: boolean;
    roles: StaffRole[];
    is_active: boolean;
  }) => {
    setSaving(true);
    try {
      const isEdit = Boolean(editing);
      const password = values.password.trim();
      const shouldSendPassword =
        Boolean(password) && (!isEdit || values.update_password);
      const body: Record<string, unknown> = {
        display_name: values.display_name,
        phone: values.phone,
        email: values.email,
        is_active: values.is_active,
        roles: values.roles,
        ...(shouldSendPassword ? { password, update_password: true } : {})
      };

      const res = await fetch(
        isEdit ? `/api/admin/staff/${editing!.user_id}` : "/api/admin/staff",
        {
          method: isEdit ? "PATCH" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        }
      );

      let data: {
        error?: string;
        code?: string;
        staff?: StaffMemberRow;
        reused_existing_auth?: boolean;
      } = {};
      try {
        data = (await res.json()) as typeof data;
      } catch {
        toast.error(
          res.ok
            ? "Saved, but the server returned an invalid response"
            : `Save failed (HTTP ${res.status}). Check the server terminal for details.`
        );
        return;
      }

      if (!res.ok) {
        if (data.code === STAFF_EMAIL_BELONGS_TO_OTHER_ACCOUNT_CODE) {
          toast.error(EMAIL_TRANSFER_BLOCKED_MESSAGE);
          return;
        }
        toast.error(
          data.error ?? `Failed to save staff member (HTTP ${res.status})`
        );
        return;
      }

      if (isEdit) {
        toast.success("Staff member updated");
      } else if (data.reused_existing_auth) {
        toast.success(
          hasRole(data.staff?.roles, "owner") || data.staff?.role === "owner"
            ? "Owner account found. Profile updated without removing the Owner role."
            : "Existing customer account found. Staff access can be added to this account."
        );
      } else {
        toast.success("Staff member added");
      }

      setModalOpen(false);
      setEditing(null);
      if (data.staff) {
        setStaff((current) => {
          const next = data.staff as StaffMemberRow;
          const exists = current.some((row) => row.user_id === next.user_id);
          return exists
            ? current.map((row) => (row.user_id === next.user_id ? next : row))
            : [...current, next];
        });
      } else {
        await loadStaff();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save staff member";
      console.error("[Staff & Roles] save request failed", err);
      toast.error(
        message === "Failed to fetch"
          ? "Could not reach the server while saving. If the app was still compiling or restarted, try Save again."
          : message
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (row: StaffMemberRow) => {
    setTogglingId(row.user_id);
    try {
      const res = await fetch(`/api/admin/staff/${row.user_id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !row.is_active })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to update status");
        return;
      }
      toast.success(row.is_active ? "Staff deactivated" : "Staff activated");
      if (data.staff) {
        setStaff((current) =>
          current.map((item) =>
            item.user_id === row.user_id ? (data.staff as StaffMemberRow) : item
          )
        );
      }
    } catch {
      toast.error("Failed to update status");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="w-full max-w-5xl [&>section]:max-w-none">
      <SettingsSection title="Staff & Roles" icon={Users}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground/70">
            Manage staff accounts and multi-role access (Admin, Worker, Delivery Staff).
          </p>
          <Button
            type="button"
            className="shrink-0 self-start sm:self-auto"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            + Add Staff
          </Button>
        </div>

        {loading ? (
          <p className="flex items-center gap-2 text-sm text-foreground/60">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading staff…
          </p>
        ) : staff.length === 0 ? (
          <p className="text-sm text-foreground/60">
            No staff members yet. Add Delivery Staff to select them on orders.
          </p>
        ) : (
          <>
            <div className="hidden rounded-xl border border-accent/20 md:block">
              <table className="w-full table-fixed text-left text-sm">
                <colgroup>
                  <col className="w-[24%]" />
                  <col className="w-[28%]" />
                  <col className="w-[20%]" />
                  <col className="w-[12%]" />
                  <col className="w-[16%]" />
                </colgroup>
                <thead className="bg-blush/40 text-foreground/70">
                  <tr>
                    <th className="px-3 py-2.5 font-medium">Staff</th>
                    <th className="px-3 py-2.5 font-medium">Email</th>
                    <th className="px-3 py-2.5 font-medium">Role(s)</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-3 py-2.5 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((row) => (
                    <tr
                      key={row.user_id}
                      className="border-t border-accent/15 align-middle"
                    >
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-foreground">
                          {row.display_name || "—"}
                        </div>
                        <div className="mt-0.5 text-xs text-foreground/55">
                          {row.phone || "No phone"}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 break-words text-foreground/80">
                        {row.email || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-foreground/80">
                        {rolesDisplay(row)}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant={row.is_active ? "gold" : "soft"}>
                          {row.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <StaffActions
                          row={row}
                          togglingId={togglingId}
                          onEdit={() => {
                            setEditing(row);
                            setModalOpen(true);
                          }}
                          onToggle={() => void toggleActive(row)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 md:hidden">
              {staff.map((row) => (
                <div
                  key={row.user_id}
                  className="rounded-xl border border-accent/20 bg-white p-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-foreground">
                        {row.display_name || "—"}
                      </div>
                      <div className="mt-0.5 text-xs text-foreground/55">
                        {row.phone || "No phone"}
                      </div>
                    </div>
                    <Badge variant={row.is_active ? "gold" : "soft"}>
                      {row.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="mt-2 space-y-1 text-sm text-foreground/75">
                    <div className="break-words">{row.email || "—"}</div>
                    <div>{rolesDisplay(row)}</div>
                  </div>
                  <div className="mt-3">
                    <StaffActions
                      row={row}
                      togglingId={togglingId}
                      onEdit={() => {
                        setEditing(row);
                        setModalOpen(true);
                      }}
                      onToggle={() => void toggleActive(row)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <StaffFormModal
          open={modalOpen}
          title={editing ? "Edit Staff" : "Add Staff"}
          initial={editing}
          knownStaff={staff}
          saving={saving}
          onClose={() => {
            if (saving) return;
            setModalOpen(false);
            setEditing(null);
          }}
          onSubmit={saveStaff}
        />
      </SettingsSection>
    </div>
  );
}
