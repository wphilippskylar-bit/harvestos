// Harvest OS service worker
// - Caches the app shell (static assets, icons, offline fallback) so the app installs cleanly as a
//   PWA and re-opens instantly even on a flaky connection.
// - For page loads AND in-app navigation (tapping around the installed app, not just hard reloads),
//   races the network against a short timeout: if the network is slow (a farm with one bar of
//   signal, not fully dead), a cached copy answers immediately instead of the app just sitting
//   there loading. If the network does eventually come back, the cache is refreshed quietly in the
//   background so the next visit is up to date.
// - Uses cache-first for hashed Next.js static assets (safe — the filename changes when content does).
// - Handles Web Push events (low-stock / harvest-due alerts) and notification clicks.
//
// One real limitation this can't remove: the very first time you ever open a given page, there's
// nothing cached yet, so that first load still needs a real connection. Once it's been opened
// successfully at least once, this file is what makes every visit after that resilient to a bad
// or missing connection.

const CACHE_VERSION = "harvestos-1785327578213";
const APP_SHELL = ["/offline.html", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

// How long to wait for the network before falling back to a cached copy. Tuned for "one bar of
// signal in a field", not a dead connection — long enough that a normal slow-but-working request
// still wins, short enough that a farmer isn't staring at a spinner for 30+ seconds.
const NETWORK_TIMEOUT_MS = 4000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error("sw-network-timeout")), ms));
}

// Network raced against a timeout, with a cached copy as the fallback for either a timeout or an
// outright failure (no signal at all). If the network eventually does resolve — even after the
// timeout already fell back to cache — the cache is still updated for next time, so a slow success
// isn't wasted.
async function networkFirstWithTimeout(request, fallbackUrl) {
  const cache = await caches.open(CACHE_VERSION);

  const networkPromise = fetch(request).then((response) => {
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  });
  // Don't let an eventual rejection from the race loser become an unhandled rejection.
  networkPromise.catch(() => {});

  try {
    return await Promise.race([networkPromise, timeout(NETWORK_TIMEOUT_MS)]);
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (fallbackUrl) {
      const fallback = await cache.match(fallbackUrl);
      if (fallback) return fallback;
    }
    // Nothing cached and the network hasn't answered yet — let the original network request keep
    // running and resolve with whatever it eventually returns (or throws), rather than hanging the
    // page on a fallback that doesn't exist. This only happens on a page that's never loaded before
    // on this device.
    return networkPromise;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Hashed static assets: cache-first, they never change once built.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(CACHE_VERSION).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  // Everything else same-origin (full page loads AND the fetch requests Next.js makes for in-app
  // Link navigation, which is how most time in an installed PWA is actually spent) — race the
  // network against a timeout, fall back to a cached copy or the offline page.
  event.respondWith(networkFirstWithTimeout(request, request.mode === "navigate" ? "/offline.html" : null));
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Harvest OS", body: event.data.text() };
  }
  const title = payload.title || "Harvest OS";
  const options = {
    body: payload.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: payload.url || "/dashboard" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
