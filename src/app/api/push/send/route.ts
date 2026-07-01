import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { getAdminMessaging } from "@/lib/server/firebase-admin";

const INVALID_TOKEN_CODES = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered"
]);

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const messageBody = typeof body.body === "string" ? body.body.trim() : "";

    if (!title || !messageBody) {
      return NextResponse.json(
        { success: false, error: "title and body are required" },
        { status: 400 }
      );
    }

    const db = createServiceClient();
    if (!db) {
      return NextResponse.json(
        { success: false, error: "DB not configured" },
        { status: 503 }
      );
    }

    const adminMessaging = getAdminMessaging();
    if (!adminMessaging) {
      return NextResponse.json(
        {
          success: false,
          error: "Firebase Admin credentials are not configured"
        },
        { status: 503 }
      );
    }

    const { data: rows, error: fetchError } = await db.from("push_tokens").select("token");

    if (fetchError) {
      throw fetchError;
    }

    const tokens = (rows ?? [])
      .map((row) => (typeof row.token === "string" ? row.token.trim() : ""))
      .filter(Boolean);

    let sent = 0;

    for (const token of tokens) {
      try {
        await adminMessaging.send({
          token,
          notification: {
            title,
            body: messageBody
          }
        });
        sent++;
      } catch (error) {
        const code =
          typeof error === "object" && error !== null && "code" in error
            ? String((error as { code?: string }).code)
            : "";

        if (INVALID_TOKEN_CODES.has(code)) {
          console.warn("[push] skipping invalid token", { token: token.slice(0, 12), code });
          continue;
        }

        console.warn("[push] token delivery failed", { token: token.slice(0, 12), error });
      }
    }

    console.log("[push] sent", sent);
    return NextResponse.json({ success: true, sent });
  } catch (error) {
    console.error("[push] send failed", error);
    return NextResponse.json(
      { success: false, error: "Failed to send push notifications" },
      { status: 500 }
    );
  }
}
