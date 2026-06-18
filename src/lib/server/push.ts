import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminMailtoSubject } from "@/lib/admin/admin-contacts";

type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000"
  );
}

async function sendFcmToken(token: string, payload: PushPayload): Promise<boolean> {
  const serverKey =
    process.env.FIREBASE_SERVER_KEY?.trim() ?? process.env.FCM_SERVER_KEY?.trim();
  if (!serverKey) return false;

  const res = await fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: {
      Authorization: `key=${serverKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      to: token,
      notification: {
        title: payload.title,
        body: payload.body
      },
      data: {
        url: payload.url ?? "/admin/orders"
      }
    })
  });

  return res.ok;
}

async function sendWebPushSubscriptions(
  subs: { endpoint: string; p256dh: string; auth: string }[],
  payload: PushPayload
): Promise<boolean> {
  const publicKey =
    process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim() ??
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey || !subs.length) return false;

  let attempted = false;
  const webpush = await import("web-push");
  webpush.setVapidDetails(getAdminMailtoSubject(), publicKey, privateKey);
  const baseUrl = appBaseUrl();

  for (const sub of subs) {
    attempted = true;
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({
          title: payload.title,
          body: payload.body,
          url: payload.url ? `${baseUrl}${payload.url}` : `${baseUrl}/admin/orders`
        })
      );
    } catch (err) {
      console.warn("[push] web-push delivery failed", err);
    }
  }
  return attempted;
}

/** Firebase / Web Push to subscribed admins. */
export async function sendPushToAdmins(
  db: SupabaseClient,
  payload: PushPayload
): Promise<boolean> {
  const { data: admins } = await db.from("admin_users").select("user_id");
  if (!admins?.length) return false;

  const adminIds = admins.map((a) => a.user_id);
  const { data: subs } = await db
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth, fcm_token")
    .in("user_id", adminIds);

  if (!subs?.length) return false;

  let attempted = false;

  for (const sub of subs) {
    if (sub.fcm_token) {
      attempted = true;
      try {
        await sendFcmToken(sub.fcm_token, payload);
      } catch (err) {
        console.warn("[push] FCM delivery failed", err);
      }
    }
  }

  const webSubs = subs.filter((s) => s.endpoint && s.p256dh && s.auth) as {
    endpoint: string;
    p256dh: string;
    auth: string;
  }[];

  if (webSubs.length) {
    const webAttempted = await sendWebPushSubscriptions(webSubs, payload);
    attempted = attempted || webAttempted;
  }

  return attempted;
}
