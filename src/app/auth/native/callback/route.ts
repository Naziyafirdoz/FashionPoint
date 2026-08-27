import { NextResponse } from "next/server";

const APP_SCHEME_FALLBACK = "mobile://auth/callback";

function isAllowedAppRedirect(value: string): boolean {
  return (
    value.startsWith("mobile://") ||
    value.startsWith("exp://") ||
    value.startsWith("exp+")
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildAppUrl(requestUrl: URL): string {
  const requested = requestUrl.searchParams.get("app_redirect") ?? APP_SCHEME_FALLBACK;
  const base = isAllowedAppRedirect(requested) ? requested : APP_SCHEME_FALLBACK;

  let appUrl: URL;
  try {
    appUrl = new URL(base);
  } catch {
    appUrl = new URL(APP_SCHEME_FALLBACK);
  }

  for (const [key, value] of requestUrl.searchParams.entries()) {
    if (key === "app_redirect") continue;
    appUrl.searchParams.set(key, value);
  }

  return appUrl.toString();
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const appUrl = buildAppUrl(requestUrl);
  const safeAppUrl = escapeHtml(appUrl);

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="refresh" content="0;url=${safeAppUrl}" />
    <title>Open Fashion Point</title>
    <script>window.location.replace(${JSON.stringify(appUrl)});</script>
  </head>
  <body style="font-family: system-ui, sans-serif; padding: 32px; text-align: center;">
    <p>Returning you to the Fashion Point app…</p>
    <p><a href="${safeAppUrl}">Open Fashion Point</a></p>
    <p style="color: #666; font-size: 14px;">If the app does not open, return to Fashion Point and sign in. Your email may already be confirmed.</p>
  </body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
