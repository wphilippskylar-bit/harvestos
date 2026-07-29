"use client";

import { useEffect, useState } from "react";
import { cacheRows, getCachedRows, type CachedTable } from "@/lib/localDb";

// Shared hook for the local-first read path (Phase 2 of the offline plan — see
// HarvestOS_Offline_LocalFirst_Plan.md in the project docs). A page's server component still does
// the real fetch and passes rows down as a prop, same as always — this hook just also mirrors
// those rows into the local cache (lib/localDb.ts) as they arrive, and falls back to whatever's
// cached if the server ever hands down an empty list while the browser is offline (which happens
// when a cached page/RSC response from a previous visit gets served by the service worker with
// stale-but-real data, or in the rarer case where the row list itself came back empty).
//
// Returns the rows to actually render, plus enough state for the page to show an honest
// "you're offline, showing data from [time]" note instead of silently presenting old data as current.
export function useLocalFirstList<T extends { id: string }>(table: CachedTable, orgId: string, serverRows: T[]) {
  const [rows, setRows] = useState<T[]>(serverRows);
  const [usingCache, setUsingCache] = useState(false);
  const [cachedAt, setCachedAt] = useState<number | null>(null);
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== "undefined" && !navigator.onLine);

  useEffect(() => {
    function goOnline() { setIsOffline(false); }
    function goOffline() { setIsOffline(true); }
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => {
    if (!orgId) return;

    if (serverRows.length > 0) {
      // Real, fresh data from the server — this is what renders, and it's what gets mirrored into
      // the cache for next time.
      setRows(serverRows);
      setUsingCache(false);
      setCachedAt(null);
      cacheRows(table, orgId, serverRows as unknown as Record<string, any>[]);
      return;
    }

    // The server handed down nothing. Could genuinely mean "no rows exist yet" — but it could also
    // mean this render came from a stale cached page with an empty snapshot, or a fetch that
    // quietly failed upstream. Check the local cache before assuming it's really empty; if there's
    // something there, prefer showing that (clearly labeled) over an empty state that isn't true.
    let cancelled = false;
    getCachedRows<T>(table, orgId).then((cached) => {
      if (cancelled || cached.length === 0) return;
      setRows(cached);
      setUsingCache(true);
      setCachedAt(Math.max(...(cached as any[]).map((r) => r._cachedAt ?? 0)));
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, orgId, serverRows]);

  return { rows, usingCache, cachedAt, isOffline };
}
