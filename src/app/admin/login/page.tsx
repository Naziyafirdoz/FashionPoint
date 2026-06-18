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

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/admin/dashboard";
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    urlError === "not_admin"
      ? "You do not have admin access. Please use a staff account."
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

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Unable to verify session.");
      setLoading(false);
      return;
    }

    const { data: adminRow } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!adminRow) {
      await supabase.auth.signOut();
      setError("This account is not authorized for admin access.");
      setLoading(false);
      return;
    }

    router.push(redirect);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-blush/30 px-4">
      <div className="w-full max-w-md">
        <AuthLayout title="Admin Login" subtitle="Fashion Point staff portal">
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
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Signing in…" : "Sign In to Admin"}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-foreground/60">
            <Link href="/" className="text-primary hover:underline">
              ← Back to store
            </Link>
          </p>
        </AuthLayout>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="py-24 text-center text-sm">Loading…</div>}>
      <AdminLoginForm />
    </Suspense>
  );
}
