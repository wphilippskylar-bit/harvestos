"use client";

import { useEffect } from "react";
import { BASE_NAV } from "@/components/Nav";

const WARM_KEY = "harvestos-cache-warmed-at";
const REWARM_AFTER_MS = 12 * 60 * 60 * 1000; // re-warm at most twice a day — enough to catch new data without hammering a slow connection every single visit

// Runs once per app load (skipped if already warmed recently) and quietly fetches every page in
// the main nav in the background. The service worker (public/sw.js) caches each successful
// response as it comes back, so by the time someone actually walks out to a low-signal spot in
// the field, those pages already have a cached copy to fall back to — instead of the cache only
// filling in reactively as they happen to visit pages while they still have signal.
//
// Deliberately does nothing if the connection already looks bad (offline, or a browser that
// reports a slow connection type) — warming the cache is only useful when there's good signal to
// spend on it; attempting it on a weak connection would just compete with whatever the person is
// actually trying to do right now.
export default function CacheWarmer() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (typeof navigator.onLine === "boolean" && !navigator.onLine) return;

    const conn = (navigator as any).connection;
    if (conn?.saveData) return;
    if (conn?.effectiveType && ["slow-2g", "2g"].includes(conn.effectiveType)) return;

    const lastWarmed = Number(localStorage.getItem(WARM_KEY) || 0);
    if (Date.now() - lastWarmed < REWARM_AFTER_MS) return;

    let cancelled = false;

    async function warm() {
      // Wait for the service worker to actually be controlling the page — warming before that is
      // pointless, the requests wouldn't get cached by it.
      try {
        await navigator.serviceWorker.ready;
      } catch {
        return;
      }
      if (cancelled) return;

      const paths = Array.from(new Set(BASE_NAV.map((item) => item.href)));

      for (const path of paths) {
        if (cancelled) return;
        // Bail out early if the connection turns bad partway through — no point burning a slow
        // connection's budget on background prefetching once someone's actually using the app.
        if (typeof navigator.onLine === "boolean" && !navigator.onLine) return;
        try {
          await fetch(path, { credentials: "same-origin" });
        } catch {
          // A single page failing to warm isn't worth surfacing — the app works the same either
          // way, this page just won't have a fresh cached fallback until it warms successfully.
        }
        // Small gap between requests so this doesn't read as a burst of traffic on a shared or
        // metered connection.
        await new Promise((r) => setTimeout(r, 400));
      }

      if (!cancelled) localStorage.setItem(WARM_KEY, String(Date.now()));
    }

    warm();
    return () => { cancelled = true; };
  }, []);

  return null;
}
