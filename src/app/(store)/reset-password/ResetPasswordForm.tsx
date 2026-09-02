"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  AuthError,
  AuthLayout,
  AuthSuccess,
  authInputClassName,
  authLabelClassName
} from "@/components/auth/AuthLayout";

const INVALID_RESET_MESSAGE =
  "This reset link is invalid or has expired. Request a new link and try again.";

function ResetPasswordFormFields({ storeName, logoUrl }: { storeName: string; logoUrl?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionValid, setSessionValid] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return;
      const valid = Boolean(user);
      setSessionValid(valid);
      setSessionReady(true);
      if (!valid) {
        setError(INVALID_RESET_MESSAGE);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [urlError]);

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
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      setSessionValid(false);
      setError(INVALID_RESET_MESSAGE);
      setLoading(false);
      return;
    }

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

  if (!sessionReady) {
    return (
      <AuthLayout title="Reset Password" subtitle="Enter your new password" storeName={storeName} logoUrl={logoUrl}>
        <p className="text-sm text-foreground/70">Checking your reset link…</p>
      </AuthLayout>
    );
  }

  if (!sessionValid) {
    return (
      <AuthLayout
        title="Reset Password"
        subtitle="Enter your new password"
        storeName={storeName}
        logoUrl={logoUrl}
        footer={
          <Link href="/forgot-password" className="font-medium text-primary hover:underline">
            Request a new reset link
          </Link>
        }
      >
        <AuthError message={error ?? INVALID_RESET_MESSAGE} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset Password"
      subtitle="Enter your new password"
      storeName={storeName}
      logoUrl={logoUrl}
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
        <button type="submit" disabled={loading || Boolean(success)} className="btn-primary w-full">
          {loading ? "Updating…" : "Update Password"}
        </button>
      </form>
    </AuthLayout>
  );
}

export function ResetPasswordForm({ storeName, logoUrl }: { storeName: string; logoUrl?: string }) {
  return (
    <Suspense fallback={<div className="py-24 text-center text-sm">Loading…</div>}>
      <ResetPasswordFormFields storeName={storeName} logoUrl={logoUrl} />
    </Suspense>
  );
}
