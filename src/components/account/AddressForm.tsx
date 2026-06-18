"use client";

import { useState, useTransition } from "react";
import {
  AuthError,
  AuthSuccess,
  authInputClassName,
  authLabelClassName
} from "@/components/auth/AuthLayout";
import type { Address } from "@/types";

const LABELS = ["Home", "Work", "Other"];

type AddressFormProps = {
  initial: Address | null;
  onCancel: () => void;
  onSaved: () => void;
  saveAction: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
};

export function AddressForm({ initial, onCancel, onSaved, saveAction }: AddressFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await saveAction(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      onSaved();
    });
  }

  return (
    <form action={handleSubmit} className="mt-4 space-y-4">
      {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <AuthError message={error} />
      <AuthSuccess message={success ? "Address saved successfully." : null} />

      <div>
        <label htmlFor="label" className={authLabelClassName()}>
          Label
        </label>
        <select
          id="label"
          name="label"
          defaultValue={initial?.label ?? "Home"}
          className={authInputClassName()}
        >
          {LABELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className={authLabelClassName()}>
            Full Name *
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={initial?.name ?? ""}
            className={authInputClassName()}
          />
        </div>
        <div>
          <label htmlFor="phone" className={authLabelClassName()}>
            Phone *
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            defaultValue={initial?.phone ?? ""}
            className={authInputClassName()}
          />
        </div>
      </div>

      <div>
        <label htmlFor="line1" className={authLabelClassName()}>
          Address Line 1 *
        </label>
        <input
          id="line1"
          name="line1"
          type="text"
          required
          defaultValue={initial?.line1 ?? ""}
          className={authInputClassName()}
        />
      </div>

      <div>
        <label htmlFor="line2" className={authLabelClassName()}>
          Address Line 2
        </label>
        <input
          id="line2"
          name="line2"
          type="text"
          defaultValue={initial?.line2 ?? ""}
          className={authInputClassName()}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="city" className={authLabelClassName()}>
            City *
          </label>
          <input
            id="city"
            name="city"
            type="text"
            required
            defaultValue={initial?.city ?? ""}
            className={authInputClassName()}
          />
        </div>
        <div>
          <label htmlFor="state" className={authLabelClassName()}>
            State *
          </label>
          <input
            id="state"
            name="state"
            type="text"
            required
            defaultValue={initial?.state ?? ""}
            className={authInputClassName()}
          />
        </div>
        <div>
          <label htmlFor="pincode" className={authLabelClassName()}>
            Pincode *
          </label>
          <input
            id="pincode"
            name="pincode"
            type="text"
            required
            pattern="[0-9]{6}"
            title="6-digit pincode"
            defaultValue={initial?.pincode ?? ""}
            className={authInputClassName()}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground/80">
        <input
          type="checkbox"
          name="is_default"
          defaultChecked={initial?.is_default ?? !initial}
          className="rounded border-accent/40 text-primary focus:ring-primary/20"
        />
        Set as default address
      </label>

      <div className="flex flex-wrap gap-3 pt-2">
        <button type="submit" disabled={pending} className="btn-primary flex-1 sm:flex-none">
          {pending ? "Saving…" : "Save Address"}
        </button>
        <button type="button" onClick={onCancel} className="btn-outline flex-1 sm:flex-none">
          Cancel
        </button>
      </div>
    </form>
  );
}
