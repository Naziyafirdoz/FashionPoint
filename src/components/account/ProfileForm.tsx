"use client";

import { useState, useTransition } from "react";
import { updateProfileAction } from "@/app/(store)/account/actions";
import {
  AuthError,
  AuthSuccess,
  authInputClassName,
  authLabelClassName
} from "@/components/auth/AuthLayout";

type ProfileFormProps = {
  email: string;
  initial: {
    full_name: string;
    phone: string;
    bust_measurement: number | string;
    waist_measurement: number | string;
    shoulder_measurement: number | string;
    preferred_size: string;
  };
};

export function ProfileForm({ email, initial }: ProfileFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await updateProfileAction(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setSuccess(true);
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <AuthError message={error} />
      <AuthSuccess message={success ? "Profile updated successfully." : null} />
      <div>
        <label className={authLabelClassName()}>Email</label>
        <input type="email" value={email} disabled className={`${authInputClassName()} opacity-60`} />
      </div>
      <div>
        <label htmlFor="full_name" className={authLabelClassName()}>
          Full Name
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          defaultValue={initial.full_name}
          className={authInputClassName()}
        />
      </div>
      <div>
        <label htmlFor="phone" className={authLabelClassName()}>
          Phone
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={initial.phone}
          className={authInputClassName()}
        />
      </div>
      <div>
        <label htmlFor="preferred_size" className={authLabelClassName()}>
          Preferred Size
        </label>
        <input
          id="preferred_size"
          name="preferred_size"
          type="text"
          placeholder="e.g. 36"
          defaultValue={initial.preferred_size}
          className={authInputClassName()}
        />
      </div>
      <fieldset className="space-y-4 border-t border-accent/20 pt-4">
        <legend className="text-sm font-semibold text-primary">Measurements (inches)</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="bust_measurement" className={authLabelClassName()}>
              Bust
            </label>
            <input
              id="bust_measurement"
              name="bust_measurement"
              type="number"
              step="0.5"
              min="0"
              defaultValue={initial.bust_measurement}
              className={authInputClassName()}
            />
          </div>
          <div>
            <label htmlFor="waist_measurement" className={authLabelClassName()}>
              Waist
            </label>
            <input
              id="waist_measurement"
              name="waist_measurement"
              type="number"
              step="0.5"
              min="0"
              defaultValue={initial.waist_measurement}
              className={authInputClassName()}
            />
          </div>
          <div>
            <label htmlFor="shoulder_measurement" className={authLabelClassName()}>
              Shoulder
            </label>
            <input
              id="shoulder_measurement"
              name="shoulder_measurement"
              type="number"
              step="0.5"
              min="0"
              defaultValue={initial.shoulder_measurement}
              className={authInputClassName()}
            />
          </div>
        </div>
      </fieldset>
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Saving…" : "Save Profile"}
      </button>
    </form>
  );
}
