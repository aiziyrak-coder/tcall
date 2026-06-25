/* Tcall service worker — web push notifications (Chrome / Edge / Firefox).
   Shows notifications even when the tab is closed, and focuses/opens the app on click. */

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { title: "Tcall", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Tcall";
  const data = payload.data || {};
  const isCall = !!payload.isCall;

  const options = {
    body: payload.body || "",
    icon: "/logo-icon.png",
    badge: "/logo-icon.png",
    tag: payload.tag || data.type || "tcall",
    renotify: true,
    requireInteraction: isCall,
    vibrate: isCall ? [400, 200, 400, 200, 400] : [200, 100, 200],
    data: data,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

function targetUrl(data) {
  if (!data) return "/dashboard";
  if (data.type === "incoming_call" && data.roomId) return "/call/" + data.roomId;
  if (data.type === "missed_call") return "/dashboard";
  if (data.type === "chat_message") return "/dashboard";
  return "/dashboard";
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = targetUrl(event.notification.data);

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client && url) {
            try {
              client.navigate(url);
            } catch (e) {
              /* ignore */
            }
          }
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
