importScripts(
  "https://www.gstatic.com/firebasejs/12.5.0/firebase-app-compat.js"
);

importScripts(
  "https://www.gstatic.com/firebasejs/12.5.0/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyClfF5PtFLmzSLQ2Yd3wvbdhfWQj0aOL-4",
  authDomain: "fashion-point-7e433.firebaseapp.com",
  projectId: "fashion-point-7e433",
  storageBucket: "fashion-point-7e433.firebasestorage.app",
  messagingSenderId: "1093769699821",
  appId: "1:1093769699821:web:d5bbb8f03d94dde2cf87e4"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/icon-192.png"
  });
});
