"use client";

import { useEffect, useId, useMemo, useState, type FocusEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  ALL_STAFF_ROLES,
  formatRolesLabel,
  hasRole,
  staffRoleLabel,
  type StaffMemberRow
} from "@/lib/admin/staff";
import type { StaffRole } from "@/lib/admin/require-staff";

type StaffFormModalProps = {
  open: boolean;
  title: string;
  initial?: StaffMemberRow | null;
  /** Current staff list — used only for Add-form email guidance (no new API). */
  knownStaff?: StaffMemberRow[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: {
    display_name: string;
    phone: string;
    email: string;
    password: string;
    /** Edit only: true when admin explicitly opted in to set a new password. */
    update_password: boolean;
    roles: StaffRole[];
    is_active: boolean;
  }) => Promise<void>;
};

const EMPTY = {
  display_name: "",
  phone: "",
  email: "",
  password: "",
  roles: ["delivery_worker"] as StaffRole[],
  is_active: true
};

const inputClassName = "mt-1 w-full rounded-lg border border-accent/25 px-3 py-2 text-sm";

/** Unlock a field only after real user focus — blocks Chrome autofill on open. */
function unlockOnFocus(event: FocusEvent<HTMLInputElement>) {
  event.currentTarget.readOnly = false;
}

function SectionHeading({ children }: { children: string }) {
  return (
    <h4 className="border-b border-accent/15 pb-1.5 text-xs font-semibold uppercase tracking-wide text-primary/80">
      {children}
    </h4>
  );
}

function PasswordVisibilityToggle({
  showPassword,
  onToggle
}: {
  showPassword: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-foreground/50 hover:bg-blush hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-roseGold/40"
      aria-label={showPassword ? "Hide password" : "Show password"}
    >
      {showPassword ? (
        <EyeOff className="h-4 w-4" aria-hidden />
      ) : (
        <Eye className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}

export function StaffFormModal({
  open,
  title,
  initial,
  knownStaff = [],
  saving,
  onClose,
  onSubmit
}: StaffFormModalProps) {
  const reactId = useId();
  const [form, setForm] = useState(EMPTY);
  const [changePassword, setChangePassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formEpoch, setFormEpoch] = useState(0);
  const isEdit = Boolean(initial);
  const isOwner = hasRole(initial?.roles ?? (initial?.role ? [initial.role] : []), "owner");

  useEffect(() => {
    if (!open) return;
    setChangePassword(false);
    setShowPassword(false);
    setFormEpoch((n) => n + 1);
    if (initial) {
      const roles =
        Array.isArray(initial.roles) && initial.roles.length > 0
          ? [...initial.roles]
          : ([initial.role] as StaffRole[]);
      setForm({
        display_name: initial.display_name ?? "",
        phone: initial.phone ?? "",
        email: initial.email ?? "",
        password: "",
        roles,
        is_active: initial.is_active
      });
      return;
    }
    setForm({ ...EMPTY, roles: ["delivery_worker"] });
  }, [open, initial]);

  const existingAccountHint = useMemo(() => {
    if (isEdit) return null;
    const email = form.email.trim().toLowerCase();
    if (!email || !email.includes("@")) return null;
    const match = knownStaff.find(
      (row) => (row.email ?? "").trim().toLowerCase() === email
    );
    if (!match) {
      return "If this email already belongs to a customer, staff access can be added to that same account.";
    }
    if (hasRole(match.roles, "owner") || match.role === "owner") {
      return "Owner account found. Saving will update the Owner profile and keep the Owner role.";
    }
    return "Existing staff account found. Saving will update this account instead of creating a duplicate.";
  }, [form.email, isEdit, knownStaff]);

  const toggleRole = (role: StaffRole) => {
    if (role === "owner") {
      // Owner cannot be granted or removed from this form casually.
      return;
    }
    setForm((prev) => {
      const has = prev.roles.includes(role);
      if (has) {
        const next = prev.roles.filter((r) => r !== role);
        // Owner row must keep owner checked even if other roles cleared.
        if (isOwner && !next.includes("owner")) {
          return { ...prev, roles: ["owner", ...next] };
        }
        return { ...prev, roles: next };
      }
      const next = isOwner
        ? Array.from(new Set<StaffRole>(["owner", ...prev.roles, role]))
        : [...prev.roles, role];
      return { ...prev, roles: next };
    });
  };

  if (!open) return null;

  const fieldKey = `${reactId}-${formEpoch}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-form-modal-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-accent/20 bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <h3 id="staff-form-modal-title" className="font-semibold text-primary">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-foreground/50 hover:bg-blush hover:text-primary"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form
          key={fieldKey}
          className="mt-5 space-y-5"
          autoComplete="off"
          onSubmit={(event) => {
            event.preventDefault();
            if (form.roles.length === 0) return;
            const password =
              isEdit && !changePassword ? "" : form.password.trim();
            void onSubmit({
              display_name: form.display_name,
              phone: form.phone,
              email: form.email,
              password,
              update_password: isEdit
                ? changePassword && Boolean(password)
                : Boolean(password),
              roles: form.roles,
              is_active: form.is_active
            });
          }}
        >
          <div
            className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0"
            aria-hidden="true"
          >
            <input type="text" name="username" autoComplete="username" tabIndex={-1} defaultValue="" />
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              tabIndex={-1}
              defaultValue=""
            />
          </div>

          <section className="space-y-3">
            <SectionHeading>Staff Information</SectionHeading>
            <label className="block text-sm">
              <span className="text-foreground/70">Full Name</span>
              <input
                required
                name={`fp-staff-name-${fieldKey}`}
                className={inputClassName}
                value={form.display_name}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                placeholder="Full name"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                readOnly={!isEdit}
                onFocus={isEdit ? undefined : unlockOnFocus}
              />
            </label>
            <label className="block text-sm">
              <span className="text-foreground/70">Phone</span>
              <input
                name={`fp-staff-phone-${fieldKey}`}
                className={inputClassName}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Phone number"
                autoComplete="off"
                inputMode="tel"
                readOnly={!isEdit}
                onFocus={isEdit ? undefined : unlockOnFocus}
              />
            </label>
          </section>

          <section className="space-y-3">
            <SectionHeading>{isEdit ? "Login Account" : "Account"}</SectionHeading>
            <label className="block text-sm">
              <span className="text-foreground/70">Email</span>
              <input
                type="email"
                required
                name={`fp-staff-email-${fieldKey}`}
                className={inputClassName}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="staff@example.com"
                autoComplete="off"
                inputMode="email"
                readOnly={!isEdit}
                onFocus={isEdit ? undefined : unlockOnFocus}
              />
              {!isEdit && existingAccountHint ? (
                <span className="mt-1.5 block rounded-lg border border-accent/20 bg-blush/30 px-2.5 py-2 text-xs text-foreground/70">
                  {existingAccountHint}
                </span>
              ) : null}
            </label>

            {isEdit ? (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-foreground/80">
                  <input
                    type="checkbox"
                    checked={changePassword}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setChangePassword(checked);
                      if (!checked) {
                        setForm((prev) => ({ ...prev, password: "" }));
                      }
                    }}
                  />
                  Set a new password
                </label>
                {changePassword ? (
                  <label className="block text-sm">
                    <span className="text-foreground/70">New password</span>
                    <div className="relative mt-1">
                      <input
                        type={showPassword ? "text" : "password"}
                        name={`fp-staff-new-password-${fieldKey}`}
                        required
                        minLength={6}
                        className={`${inputClassName} !mt-0 pr-10`}
                        value={form.password}
                        onChange={(e) =>
                          setForm({ ...form, password: e.target.value })
                        }
                        placeholder="Minimum 6 characters"
                        autoComplete="new-password"
                      />
                      <PasswordVisibilityToggle
                        showPassword={showPassword}
                        onToggle={() => setShowPassword((v) => !v)}
                      />
                    </div>
                  </label>
                ) : null}
              </div>
            ) : (
              <label className="block text-sm">
                <span className="text-foreground/70">Password</span>
                <div className="relative mt-1">
                  <input
                    type={showPassword ? "text" : "password"}
                    name={`fp-staff-new-password-${fieldKey}`}
                    minLength={6}
                    className={`${inputClassName} !mt-0 pr-10`}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Required for new accounts; optional if email already exists"
                    autoComplete="new-password"
                    readOnly
                    onFocus={unlockOnFocus}
                  />
                  <PasswordVisibilityToggle
                    showPassword={showPassword}
                    onToggle={() => setShowPassword((v) => !v)}
                  />
                </div>
                <span className="mt-1 block text-xs text-foreground/55">
                  Leave blank when adding an existing customer or owner email.
                </span>
              </label>
            )}
          </section>

          <section className="space-y-3">
            <SectionHeading>Roles</SectionHeading>
            <fieldset className="space-y-2">
              <legend className="sr-only">Roles</legend>
              {ALL_STAFF_ROLES.map((role) => {
                const checked = form.roles.includes(role);
                const ownerLocked = role === "owner";
                const disabled = ownerLocked;
                return (
                  <label
                    key={role}
                    className={`flex items-center gap-2 text-sm ${
                      disabled ? "text-foreground/55" : "text-foreground/80"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleRole(role)}
                    />
                    {staffRoleLabel(role)}
                  </label>
                );
              })}
              <p className="text-xs text-foreground/55">
                {isOwner
                  ? "Owner is required for this account. You can also grant Admin, Worker, and/or Delivery Staff."
                  : "Select one or more roles. Owner cannot be assigned here — only the existing Owner account keeps Owner."}
              </p>
              {form.roles.length === 0 ? (
                <p className="text-xs text-red-600">Select at least one role.</p>
              ) : (
                <p className="text-xs text-foreground/60">
                  Selected: {formatRolesLabel(form.roles)}
                </p>
              )}
            </fieldset>
          </section>

          <section className="space-y-3">
            <SectionHeading>{isEdit ? "Account Status" : "Status"}</SectionHeading>
            <label className="block text-sm">
              <span className="text-foreground/70">Status</span>
              <select
                className={inputClassName}
                value={form.is_active ? "active" : "inactive"}
                onChange={(e) =>
                  setForm({ ...form, is_active: e.target.value === "active" })
                }
                disabled={isOwner}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
          </section>

          <div className="flex justify-end gap-2 border-t border-accent/15 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || form.roles.length === 0}>
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Add staff"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
