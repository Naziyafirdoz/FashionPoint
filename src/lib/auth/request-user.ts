import { NextResponse } from "next/server";
import { createClient as createSupabaseJsClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { createClient as createCookieClient } from "@/lib/supabase/server";

export type RequestAuthSuccess = {
  ok: true;
  user: User;
  supabase: SupabaseClient;
};

export type RequestAuthFailure = {
  ok: false;
  response: NextResponse;
};

function unauthorized(): RequestAuthFailure {
  return {
    ok: false,
    response: NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  };
}

function authorizationHeader(request: Request): string | null {
  return request.headers.get("authorization");
}

function hasBearerScheme(request: Request): boolean {
  const header = authorizationHeader(request);
  return Boolean(header && /^Bearer\s+/i.test(header.trim()));
}

function extractBearerAccessToken(request: Request): string | null {
  const header = authorizationHeader(request);
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match?.[1] ?? null;
}

function createAccessTokenClient(accessToken: string): SupabaseClient {
  return createSupabaseJsClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      },
      global: {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    }
  );
}

/**
 * Resolve the caller from a mobile access token or existing website cookies.
 * A present Bearer header never falls back to cookies.
 * Identity always comes from Supabase Auth `getUser()`, never from a client-supplied user id.
 */
export async function getRequestAuthUser(request: Request): Promise<RequestAuthSuccess | RequestAuthFailure> {
  if (hasBearerScheme(request)) {
    const accessToken = extractBearerAccessToken(request);
    if (!accessToken) return unauthorized();

    const supabase = createAccessTokenClient(accessToken);
    const {
      data: { user },
      error
    } = await supabase.auth.getUser(accessToken);

    if (error || !user) return unauthorized();
    return { ok: true, user, supabase };
  }

  const supabase = await createCookieClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return unauthorized();
  return { ok: true, user, supabase };
}

export async function requireRequestUser(
  request: Request
): Promise<RequestAuthSuccess | RequestAuthFailure> {
  return getRequestAuthUser(request);
}
