const APP_URL = "/pomodoro/";

globalThis.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url ?? APP_URL;
  event.waitUntil(
    globalThis.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if ("focus" in client) {
            return client.focus();
          }
        }
        if (globalThis.clients.openWindow) {
          return globalThis.clients.openWindow(target);
        }
        return undefined;
      }),
  );
});
