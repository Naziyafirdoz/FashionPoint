import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { getFirebaseApp } from "./firebase";

export async function requestNotificationPermission() {
  try {
    const supported = await isSupported();

    if (!supported) {
      console.log("Notifications not supported");
      return null;
    }

    const app = getFirebaseApp();
    if (!app) {
      console.log("Firebase is not configured");
      return null;
    }

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.log("Firebase VAPID key is not configured");
      return null;
    }

    const messaging = getMessaging(app);

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      console.log("Notification permission denied");
      return null;
    }

    if ("serviceWorker" in navigator) {
      await navigator.serviceWorker.register("/sw.js");
    }

    const registration = await navigator.serviceWorker.ready;

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration
    });

    return token || null;
  } catch (error) {
    console.error("Error getting token:", error);
    return null;
  }
}
