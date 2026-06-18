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

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/account/dashboard`
      }
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const payload = { userId: data.user.id, email, fullName, phone };
      if (data.session) {
        await fetch("/api/auth/ensure-customer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fullName, phone })
        });
      } else {
        await fetch("/api/auth/register-customer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }
    }

    if (data.session) {
      router.push("/account/dashboard");
      router.refresh();
      return;
    }

    setSuccess("Account created! Check your email to confirm, then sign in.");
    setLoading(false);
  }

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Join Fashion Point for a personalized blouse shopping experience"
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthError message={error} />
        <AuthSuccess message={success} />
        <div>
          <label htmlFor="fullName" className={authLabelClassName()}>
            Full Name
          </label>
          <input
            id="fullName"
            type="text"
            required
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={authInputClassName()}
          />
        </div>
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
          <label htmlFor="phone" className={authLabelClassName()}>
            Phone
          </label>
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
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
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authInputClassName()}
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Creating account…" : "Create Account"}
        </button>
      </form>
    </AuthLayout>
  );
}
