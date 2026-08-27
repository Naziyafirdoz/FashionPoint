import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/account/dashboard";
  }
  return raw;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));
  const isPasswordReset = next === "/reset-password" || next.startsWith("/reset-password?");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  if (isPasswordReset) {
    return NextResponse.redirect(`${origin}/reset-password?error=invalid_or_expired`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
