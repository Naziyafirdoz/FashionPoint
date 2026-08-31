"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  AuthError,
  AuthLayout,
  authInputClassName,
  authLabelClassName
} from "@/components/auth/AuthLayout";

function LoginFormFields({ storeName }: { storeName: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/account/dashboard";
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    urlError === "auth_callback_failed"
      ? "Authentication failed. Please try again."
      : null
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push(redirect);
    router.refresh();
  }

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle={`Sign in to your ${storeName} account`}
      storeName={storeName}
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthError message={error} />
        <div>
          <label htmlFor="email" className={authLabelClassName()}>
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authInputClassName()}
          />
        </div>
        <div>
          <label htmlFor="password" className={authLabelClassName()}>
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authInputClassName()}
          />
        </div>
        <div className="text-right">
          <Link href="/forgot-password" className="text-sm text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>
    </AuthLayout>
  );
}

export function LoginForm({ storeName }: { storeName: string }) {
  return (
    <Suspense fallback={<div className="py-24 text-center text-sm">Loading…</div>}>
      <LoginFormFields storeName={storeName} />
    </Suspense>
  );
}
