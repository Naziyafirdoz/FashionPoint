import { NextResponse } from "next/server";

/**
 * Public Firebase web config for service workers.
 * Only NEXT_PUBLIC_* values are returned; safe when unset.
 */
export async function GET() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!apiKey || !projectId) {
    return NextResponse.json({ configured: false }, { status: 404 });
  }

  return NextResponse.json({
    configured: true,
    apiKey,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? undefined,
    projectId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? undefined,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? undefined,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? undefined
  });
}
