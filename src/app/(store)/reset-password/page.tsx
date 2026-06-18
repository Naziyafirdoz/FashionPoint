"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  AuthError,
  AuthLayout,
  AuthSuccess,
  authInputClassName,
  authLabelClassName
} from "@/components/auth/AuthLayout";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setSuccess("Password updated successfully. Redirecting…");
    setTimeout(() => {
      router.push("/account/dashboard");
      router.refresh();
    }, 1500);
  }

  return (
    <AuthLayout
      title="Reset Password"
      subtitle="Enter your new password"
      footer={
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthError message={error} />
        <AuthSuccess message={success} />
        <div>
          <label htmlFor="password" className={authLabelClassName()}>
            New Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authInputClassName()}
          />
        </div>
        <div>
          <label htmlFor="confirm" className={authLabelClassName()}>
            Confirm Password
          </label>
          <input
            id="confirm"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={authInputClassName()}
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Updating…" : "Update Password"}
        </button>
      </form>
    </AuthLayout>
  );
}
