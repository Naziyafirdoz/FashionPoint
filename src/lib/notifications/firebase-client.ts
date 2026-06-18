"use client";

import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getMessaging, getToken, isSupported, type Messaging } from "firebase/messaging";

function firebaseConfig() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!apiKey || !projectId) return null;

  return {
    apiKey,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  };
}

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  const supported = await isSupported();
  if (!supported) return null;

  const config = firebaseConfig();
  if (!config) return null;

  if (!app) {
    app = getApps().length ? getApps()[0]! : initializeApp(config);
  }
  if (!messaging) {
    messaging = getMessaging(app);
  }
  return messaging;
}

export async function registerAdminFcmToken(): Promise<string | null> {
  if (typeof window === "undefined" || !("Notification" in window)) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const msg = await getFirebaseMessaging();
  if (!msg) return null;

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) return null;

  if ("serviceWorker" in navigator) {
    await navigator.serviceWorker.register("/sw.js");
  }

  const token = await getToken(msg, { vapidKey });
  return token || null;
}
