// Service worker Partar: sýnir ýtitilkynningar og opnar réttu síðuna þegar smellt er.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Partar", body: event.data ? event.data.text() : "" };
  }
  const url = data.url || "/";

  event.waitUntil(
    (async () => {
      // Engin tilkynning ef notandinn er þegar með þessa síðu opna og í forgrunni
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const viewing = windows.some((w) => w.focused && new URL(w.url).pathname === url);
      if (viewing) return;

      await self.registration.showNotification(data.title || "Partar", {
        body: data.body || "",
        icon: "/pwa-icon/192",
        badge: "/pwa-icon/192",
        tag: data.tag,
        renotify: Boolean(data.tag),
        lang: "is",
        data: { url },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const w of windows) {
        if (w.url === url && "focus" in w) return w.focus();
      }
      const existing = windows.find((w) => "navigate" in w);
      if (existing) {
        await existing.navigate(url);
        return existing.focus();
      }
      return self.clients.openWindow(url);
    })(),
  );
});

// Ef vafrinn endurnýjar áskriftina sjálfur þarf að skrá hana aftur næst þegar appið er opnað
self.addEventListener("pushsubscriptionchange", () => {});
