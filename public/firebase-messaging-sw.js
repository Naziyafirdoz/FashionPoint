importScripts(
  "https://www.gstatic.com/firebasejs/12.5.0/firebase-app-compat.js"
);

importScripts(
  "https://www.gstatic.com/firebasejs/12.5.0/firebase-messaging-compat.js"
);

async function bootstrapFirebaseMessaging() {
  try {
    const res = await fetch("/api/public/firebase-config");
    if (!res.ok) return;

    const config = await res.json();
    if (!config?.apiKey || !config?.projectId) return;

    firebase.initializeApp({
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId
    });

    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      const title = payload?.notification?.title || "New notification";
      const body = payload?.notification?.body || "";
      self.registration.showNotification(title, {
        body,
        icon: "/icon-192.png"
      });
    });
  } catch {
    // Firebase optional for deployments without messaging configured.
  }
}

void bootstrapFirebaseMessaging();
