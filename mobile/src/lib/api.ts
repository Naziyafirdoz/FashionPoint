import { supabase } from "@/lib/supabase";

function resolveApiOrigin(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  return (configured || "https://fashion-point-seven.vercel.app").replace(/\/$/, "");
}

export const API_ORIGIN = resolveApiOrigin();

export type ApiErrorCode =
  | "unauthenticated"
  | "unauthorized"
  | "expired"
  | "network"
  | "server";

export class ApiError extends Error {
  status: number;
  path?: string;
  code?: ApiErrorCode;

  constructor(message: string, status = 0, path?: string, code?: ApiErrorCode) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.path = path;
    this.code = code;
  }
}

function isDevLogEnabled(): boolean {
  return typeof __DEV__ !== "undefined" && __DEV__;
}

function redactSecrets(value: string): string {
  return value
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/"access_token"\s*:\s*"[^"]*"/gi, '"access_token":"[redacted]"')
    .replace(/"refresh_token"\s*:\s*"[^"]*"/gi, '"refresh_token":"[redacted]"');
}

function accountDebug(message: string, details: Record<string, unknown>) {
  if (!isDevLogEnabled()) return;
  console.log(`[account-api] ${message}`, details);
}

export function resolveMediaUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const url = value.trim();
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return `${API_ORIGIN}${url}`;
  return `${API_ORIGIN}/${url}`;
}

const ACCESS_TOKEN_REFRESH_SKEW_MS = 30_000;

let refreshInFlight: Promise<string | null> | null = null;

function readJwtExpiryMs(token: string): number | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const padded = payload.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (payload.length % 4)) % 4);
    const json = globalThis.atob?.(padded);
    if (!json) return null;
    const parsed = JSON.parse(json) as { exp?: unknown };
    return typeof parsed.exp === "number" ? parsed.exp * 1000 : null;
  } catch {
    return null;
  }
}

function isAccessTokenFresh(token: string): boolean {
  const expiresAt = readJwtExpiryMs(token);
  if (expiresAt == null) return true;
  return expiresAt > Date.now() + ACCESS_TOKEN_REFRESH_SKEW_MS;
}

async function refreshAccessTokenOnce(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session?.access_token) return null;
    return data.session.access_token;
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

/** Returns a current access token, refreshing once if the local JWT is expired or near expiry. */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session?.access_token) return null;
  if (isAccessTokenFresh(session.access_token)) return session.access_token;
  if (!session.refresh_token) return null;
  return refreshAccessTokenOnce();
}

type ApiFetchOptions = RequestInit & {
  auth?: "auto" | "required" | "none";
};

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { auth = "auto", headers: initHeaders, ...init } = options;
  const headers = new Headers(initHeaders);
  const method = (init.method ?? "GET").toString().toUpperCase();
  const url = `${API_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = auth === "none" ? null : await getAccessToken();
  if (auth === "required" && !token) {
    accountDebug("missing access token", { url, method, auth });
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      throw new ApiError("Your session has expired. Please sign in again.", 401, path, "expired");
    }
    throw new ApiError("Please sign in to continue.", 401, path, "unauthenticated");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  accountDebug("request", {
    url,
    method,
    auth,
    hasSessionToken: Boolean(token),
    authorizationSent: Boolean(token),
  });

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers,
    });
  } catch (err) {
    accountDebug("network failure", {
      url,
      method,
      message: err instanceof Error ? err.message : "fetch failed",
    });
    throw new ApiError("No internet connection. Please check your network and try again.", 0, path, "network");
  }

  const rawText = await response.text();
  const contentType = response.headers.get("content-type") ?? "";
  let payload: { error?: unknown; message?: unknown } = {};
  let jsonParsed = false;
  try {
    payload = rawText ? (JSON.parse(rawText) as { error?: unknown; message?: unknown }) : {};
    jsonParsed = true;
  } catch {
    payload = {};
  }

  accountDebug("response", {
    url,
    method,
    status: response.status,
    ok: response.ok,
    contentType,
    jsonParsed,
    bodyLength: rawText.length,
    jsonKeys:
      jsonParsed && payload && typeof payload === "object" ? Object.keys(payload).slice(0, 20) : [],
    bodyPreview: redactSecrets(rawText.slice(0, 240)),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new ApiError(
        token
          ? "We could not verify your sign-in with the store. Please sign in again."
          : "Please sign in to continue.",
        401,
        path,
        token ? "unauthorized" : "unauthenticated"
      );
    }
    const apiMessage =
      typeof payload.error === "string"
        ? payload.error
        : typeof payload.message === "string"
          ? payload.message
          : null;
    const message =
      apiMessage ??
      (isDevLogEnabled()
        ? `${method} ${path} failed (${response.status})${jsonParsed ? "" : ` ${contentType || "non-JSON"}`}`
        : "Something went wrong. Please try again.");
    throw new ApiError(
      message,
      response.status,
      path,
      response.status >= 500 ? "server" : undefined
    );
  }

  return payload as T;
}

export function toUserMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
