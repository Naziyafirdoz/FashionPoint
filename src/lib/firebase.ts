import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";

function readFirebaseConfig() {
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

let cachedApp: FirebaseApp | null | undefined;

/** Returns the Firebase app when NEXT_PUBLIC_FIREBASE_* is configured; otherwise null. */
export function getFirebaseApp(): FirebaseApp | null {
  if (cachedApp !== undefined) return cachedApp;

  const config = readFirebaseConfig();
  if (!config) {
    cachedApp = null;
    return null;
  }

  cachedApp = getApps().length ? getApp() : initializeApp(config);
  return cachedApp;
}
