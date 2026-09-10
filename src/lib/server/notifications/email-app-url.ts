/**
 * Email link base URL resolution.
 *
 * Environment variables (checked in order; first valid value wins):
 *
 * - APP_URL — primary server-side URL for email action links
 * - NEXT_PUBLIC_APP_URL — optional public fallback when APP_URL is unset or invalid
 * - NEXT_PUBLIC_SITE_URL — optional second fallback (often the marketing/production domain)
 *
 * Production never uses localhost or href="#". Falls back to SITE_URL from site-config.
 */

import { SITE_URL } from "@/lib/site-config";

const LOCAL_DEV_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

const EMAIL_APP_URL_ENV_KEYS = [
  "APP_URL",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SITE_URL"
] as const;

const PRODUCTION_EMAIL_BASE_FALLBACK = SITE_URL.replace(/\/$/, "");

function isLocalDevHost(hostname: string): boolean {
  return LOCAL_DEV_HOSTS.has(hostname.toLowerCase());
}

function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
}

/** Vercel preview deployments are password-protected and must not appear in emails. */
function isVercelPreviewHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (!host.endsWith(".vercel.app")) return false;

  if (host.endsWith("-projects.vercel.app")) return true;
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
        "[email] rejected Vercel preview URL for email links — set APP_URL to production domain",
        { hostname: host }
      );
      return undefined;
    }

    if (isProductionRuntime() && isLocalDevHost(host)) {
      console.warn("[email] rejected localhost URL for production email links", { hostname: host });
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

function resolveProductionEmailBase(): string {
  const fromSiteConfig = normalizeEmailAppUrl(PRODUCTION_EMAIL_BASE_FALLBACK);
  return fromSiteConfig ?? PRODUCTION_EMAIL_BASE_FALLBACK;
}

/** Resolved public (or local dev) base URL for links embedded in outbound emails. */
export function getEmailAppUrl(): string {
  for (const key of EMAIL_APP_URL_ENV_KEYS) {
    const value = process.env[key];
    if (!value) continue;

    const normalized = normalizeEmailAppUrl(value);
    if (normalized) return normalized;
  }

  if (!isProductionRuntime()) {
    return "http://localhost:3000";
  }

  return resolveProductionEmailBase();
}

/** Absolute HTTPS URL for an in-app path used in email HTML. Never returns "#" in production. */
export function emailAppUrl(path: string): string {
  const base = getEmailAppUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

/** Admin order detail page — used for post-approval “View Order” links (not Approve CTA). */
export function adminOrderEmailUrl(orderId: string): string {
  const trimmed = orderId.trim();
  return emailAppUrl(`/admin/orders/${encodeURIComponent(trimmed)}`);
}

/** Admin dashboard — used for email CTA buttons. */
export function adminDashboardEmailUrl(): string {
  return emailAppUrl("/admin/dashboard");
}
