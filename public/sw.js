// Service worker Partar: hröð ræsing af heimaskjá, ýtitilkynningar og opnun réttrar síðu.
//
// Hraði: JavaScript/letur (/_next/static, nöfnin breytast með hverri útgáfu) og myndir (/myndir)
// eru geymd í símanum. Forsíðan birtist strax úr geymslu og ný útgáfa er sótt í bakgrunni;
// síðan sjálf sækir svo ferskt efni um leið (data-sw-cache, sjá components/service-worker.tsx).

const VERSION = "1";
const STATIC_CACHE = `partar-kodi-${VERSION}`;
const IMAGE_CACHE = `partar-myndir-${VERSION}`;
const PAGE_CACHE = `partar-sidur-${VERSION}`;
const CACHES = [STATIC_CACHE, IMAGE_CACHE, PAGE_CACHE];
const MAX_IMAGES = 300;
const HOME_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const USER_KEY = "/__partar-notandi";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith("partar-") && !CACHES.includes(key)) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  ),
);

// Fyrst úr geymslu, annars af netinu (og geymt). Aðeins fyrir skrár sem breytast aldrei.
async function cacheFirst(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok && res.type === "basic") {
    await cache.put(request, res.clone());
    if (maxEntries) {
      const keys = await cache.keys();
      for (const old of keys.slice(0, Math.max(0, keys.length - maxEntries))) await cache.delete(old);
    }
  }
  return res;
}

// Merkir síðu úr geymslu svo hún sæki ferskt efni strax eftir að hún birtist
async function markFromCache(res) {
  const html = (await res.text()).replace("<html", '<html data-sw-cache="1"');
  return new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
}

let servedStaleAt = 0;

async function home(event) {
  const cache = await caches.open(PAGE_CACHE);
  const network = fetch(event.request).then(async (res) => {
    if (res.ok && res.type === "basic" && !res.redirected && (res.headers.get("content-type") || "").includes("text/html")) {
      // Aðeins einfaldir hausar: líkaminn er þegar afþjappaður og lengdin getur breyst
      const headers = { "content-type": "text/html; charset=utf-8", "x-partar-geymt": String(Date.now()) };
      await cache.put("/", new Response(await res.clone().blob(), { status: 200, headers }));
    }
    return res;
  });

  // Nýbúið að sýna geymda útgáfu (t.d. síðan endurhleðst eftir nýja útgáfu): beint af netinu
  const recent = Date.now() - servedStaleAt < 15000;
  const cached = recent ? null : await cache.match("/");
  const fresh = cached && Date.now() - Number(cached.headers.get("x-partar-geymt") || 0) < HOME_MAX_AGE;
  if (fresh) {
    servedStaleAt = Date.now();
    event.waitUntil(network.catch(() => {}));
    return markFromCache(cached);
  }
  try {
    return await network;
  } catch {
    const offline = await cache.match("/");
    if (offline) return markFromCache(offline);
    throw new Error("offline");
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (url.pathname.startsWith("/myndir/")) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE, MAX_IMAGES));
  } else if (request.mode === "navigate" && url.pathname === "/" && !url.search) {
    event.respondWith(home(event));
  } else if (request.mode === "navigate") {
    // Aðrar síður alltaf af netinu; án nets er geymda forsíðan betri en villusíða
    event.respondWith(
      fetch(request).catch(async () => {
        const offline = await (await caches.open(PAGE_CACHE)).match("/");
        if (offline) return markFromCache(offline);
        throw new Error("offline");
      }),
    );
  }
});

// Síðan segir hvaða notandi er innskráður. Skipti um notanda (eða útskráning) =
// geymda forsíðan tilheyrir einhverjum öðrum og er hent.
self.addEventListener("message", (event) => {
  if (event.data?.type !== "notandi") return;
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PAGE_CACHE);
      const prev = await cache.match(USER_KEY);
      const id = String(event.data.id || "");
      if (prev && (await prev.text()) === id) return;
      await cache.delete("/");
      await cache.put(USER_KEY, new Response(id));
    })(),
  );
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Partar", body: event.data ? event.data.text() : "" };
  }
  const url = data.url || "/";

  // Alltaf þarf að sýna tilkynningu: iPhone afturkallar áskriftina ef ýtingum er sleppt
  // og Chrome sýnir þá sjálfur almenna „uppfært í bakgrunni“ tilkynningu
  event.waitUntil(
    self.registration.showNotification(data.title || "Partar", {
      body: data.body || "",
      icon: "/pwa-icon/192",
      badge: "/pwa-icon/192",
      tag: data.tag,
      renotify: Boolean(data.tag),
      lang: "is",
      data: { url },
    }),
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
