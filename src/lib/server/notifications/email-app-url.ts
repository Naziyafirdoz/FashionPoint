import os from "node:os";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

function normalizeBaseUrl(raw: string, allowLocalhost = false): string | undefined {
  const trimmed = raw.trim().replace(/\/$/, "");
  if (!trimmed) return undefined;

  try {
    const href = trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;
    const url = new URL(href);
    if (!allowLocalhost && LOCAL_HOSTS.has(url.hostname.toLowerCase())) return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}

function getDevelopmentAppUrl(): string | undefined {
  if (process.env.NODE_ENV !== "development") return undefined;

  const explicitDev = process.env.DEV_APP_URL?.trim();
  if (explicitDev) {
    const normalized = normalizeBaseUrl(explicitDev, true);
    if (normalized) return normalized;
  }

  const port = process.env.PORT?.trim() || "3000";
  const interfaces = os.networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    if (!entries) continue;
    for (const entry of entries) {
      const family = String(entry.family);
      if (family === "IPv4" && !entry.internal) {
        return `http://${entry.address}:${port}`;
      }
    }
  }

  return undefined;
}

/** App URL for email links — production env first, LAN IP in development when unset. */
export function getEmailAppUrl(): string | undefined {
  for (const key of ["APP_URL", "NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_SITE_URL"]) {
    const value = process.env[key];
    if (!value) continue;
    const normalized = normalizeBaseUrl(value);
    if (normalized) return normalized;
  }

  return getDevelopmentAppUrl();
}

/** Absolute URL for an in-app path used in email HTML. */
export function emailAppUrl(path: string): string {
  const base = getEmailAppUrl();
  if (!base) {
    console.warn(
      "[email] APP_URL / NEXT_PUBLIC_APP_URL not configured — email action links omitted"
    );
    return "#";
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
