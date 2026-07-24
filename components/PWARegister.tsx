"use client";

import { useEffect } from "react";

// Registers the service worker (public/sw.js) on first load so the app installs as a PWA
// ("Add to Home Screen") and gets offline app-shell caching. Silently no-ops on browsers without
// service worker support — nothing else in the app depends on it being present.
export default function PWARegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let refreshing = false;
    // When a newly-activated service worker takes control of the page (i.e. a new deploy's
    // service worker has finished installing and won over the old one), the page it's serving is
    // stale — reload once so the installed app actually shows the new version instead of quietly
    // running old code until the user manually closes and reopens it.
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        // Check for a new service worker on every load, not just whenever the browser feels like
        // it — this is what makes updates actually show up promptly after a deploy.
        reg.update().catch(() => {});
      })
      .catch(() => {
        // Non-fatal — the app works fine without an installed service worker, it just won't be
        // installable/offline-capable on this browser.
      });
  }, []);
  return null;
}
