/**
 * Email link base URL resolution.
 *
 * Environment variables (checked in order; first valid value wins):
 *
 * - APP_URL — primary server-side URL for email action links (approve, remind, admin order pages).
 *   Local dev:  http://localhost:3000
 *   Production: https://fashionpointvijayawada.com (or your production Vercel URL, e.g. https://your-project.vercel.app)
 *   Never use a Vercel *preview* deployment URL (…-projects.vercel.app) — those are password-protected.
 *
 * - NEXT_PUBLIC_APP_URL — optional public fallback when APP_URL is unset or invalid.
 *
 * - NEXT_PUBLIC_SITE_URL — optional second fallback (often the marketing/production domain).
 *
 * Preview deployment URLs and LAN IPs (192.168.x.x, etc.) are rejected.
 * localhost / 127.0.0.1 are allowed for local development only.
 */

const LOCAL_DEV_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

const EMAIL_APP_URL_ENV_KEYS = [
  "APP_URL",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SITE_URL"
] as const;

function isLocalDevHost(hostname: string): boolean {
  return LOCAL_DEV_HOSTS.has(hostname.toLowerCase());
}

/** Vercel preview deployments are password-protected and must not appear in emails. */
function isVercelPreviewHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (!host.endsWith(".vercel.app")) return false;

  // Per-deployment team URLs, e.g. project-abc123team-projects.vercel.app
  if (host.endsWith("-projects.vercel.app")) return true;

  // Git branch previews, e.g. project-git-main-team.vercel.app
  if (/-git-[a-z0-9-]+-/i.test(host)) return true;

  return false;
}

function isPrivateLanHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host.endsWith(".local")) return true;
  if (host.startsWith("192.168.")) return true;
  if (host.startsWith("10.")) return true;
  if (host.startsWith("127.") && !isLocalDevHost(host)) return true;

  const match172 = /^172\.(\d+)\./.exec(host);
  if (match172) {
    const second = Number.parseInt(match172[1], 10);
    if (second >= 16 && second <= 31) return true;
  }

  return false;
}

function normalizeEmailAppUrl(raw: string): string | undefined {
  const trimmed = raw.trim().replace(/\/$/, "");
  if (!trimmed) return undefined;

  try {
    const href =
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? trimmed
        : `https://${trimmed}`;
    const url = new URL(href);
    const host = url.hostname.toLowerCase();

    if (isVercelPreviewHost(host)) {
      console.warn(
        "[email] rejected Vercel preview URL for email links — set APP_URL to production domain or http://localhost:3000",
        { hostname: host }
      );
      return undefined;
    }

    if (isLocalDevHost(host)) {
      return url.origin;
    }

    if (isPrivateLanHost(host)) {
      console.warn("[email] rejected private LAN URL for email links", { hostname: host });
      return undefined;
    }

    return url.origin;
  } catch {
    return undefined;
  }
}

/** Resolved public (or local dev) base URL for links embedded in outbound emails. */
export function getEmailAppUrl(): string | undefined {
  for (const key of EMAIL_APP_URL_ENV_KEYS) {
    const value = process.env[key];
    if (!value) continue;

    const normalized = normalizeEmailAppUrl(value);
    if (normalized) return normalized;
  }

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }

  return undefined;
}

/** Absolute URL for an in-app path used in email HTML. */
export function emailAppUrl(path: string): string {
  const base = getEmailAppUrl();
  if (!base) {
    console.warn(
      "[email] no valid APP_URL / NEXT_PUBLIC_APP_URL / NEXT_PUBLIC_SITE_URL — email action links omitted"
    );
    return "#";
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
