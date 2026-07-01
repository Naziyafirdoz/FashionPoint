import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging, type Messaging } from "firebase-admin/messaging";
import type { ServiceAccount } from "firebase-admin";

let messaging: Messaging | null = null;

function initFirebaseAdmin() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!serviceAccountJson) {
    return null;
  }

  const serviceAccount = JSON.parse(serviceAccountJson) as ServiceAccount;

  return initializeApp({
    credential: cert(serviceAccount)
  });
}

/** Lazy Firebase Admin Messaging — null when FIREBASE_SERVICE_ACCOUNT_JSON is unset. */
export function getAdminMessaging(): Messaging | null {
  if (messaging) {
    return messaging;
  }

  const app = initFirebaseAdmin();
  if (!app) {
    return null;
  }

  messaging = getMessaging(app);
  return messaging;
}
