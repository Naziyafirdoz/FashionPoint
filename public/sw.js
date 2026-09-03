self.addEventListener("push", (event) => {
  let data = { title: "New notification", body: "New notification", url: "/admin/orders" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // ignore
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      data: { url: data.url }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/admin/orders";
  event.waitUntil(clients.openWindow(url));
});
