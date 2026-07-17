"use client";

import { useEffect } from "react";

// Registers the service worker (public/sw.js) on first load so the app installs as a PWA
// ("Add to Home Screen") and gets offline app-shell caching. Silently no-ops on browsers without
// service worker support — nothing else in the app depends on it being present.
export default function PWARegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Non-fatal — the app works fine without an installed service worker, it just won't be
        // installable/offline-capable on this browser.
      });
    }
  }, []);
  return null;
}
