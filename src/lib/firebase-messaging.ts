import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { app } from "./firebase";

export async function requestNotificationPermission() {
  try {
    const supported = await isSupported();

    if (!supported) {
      console.log("Notifications not supported");
      return null;
    }

    const messaging = getMessaging(app);

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      console.log("Notification permission denied");
      return null;
    }

    console.log("Step 1");

    const registration = await navigator.serviceWorker.ready;

    console.log("Step 2", registration);

    console.log("Step 3");

    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    console.log("Step 4");
    console.log("FCM Token:", token);

    return token;
  } catch (error) {
    console.error("Error getting token:", error);
    return null;
  }
}
