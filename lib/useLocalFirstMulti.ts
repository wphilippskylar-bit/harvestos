"use client";

import { useEffect, useMemo, useState } from "react";
import { cacheRows, getCachedRows, type CachedTable } from "@/lib/localDb";

// Multi-table variant of useLocalFirstList.ts, for pages like the Dashboard that read through
// several tables at once to compute derived stats. A page can't call useLocalFirstList in a loop
// (that breaks React's Hooks rules), so this takes the whole list of tables it needs in one call
// and mirrors/falls back across all of them together.
//
// Same fallback rule as the single-table hook: if the server handed down real rows for these
// tables, that's what renders (and gets cached for next time). If everything came back empty —
// most likely a stale cached page/RSC response served while offline — fall back to whatever's in
// the local cache for each table instead of showing an empty dashboard that isn't really empty.
export type TableSpec = { table: CachedTable; orgId: string; serverRows: Record<string, any>[] };

export function useLocalFirstMulti(specs: TableSpec[]) {
  const initial = useMemo(() => Object.fromEntries(specs.map((s) => [s.table, s.serverRows])), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [data, setData] = useState<Record<string, Record<string, any>[]>>(initial);
  const [usingCache, setUsingCache] = useState(false);
  const [cachedAt, setCachedAt] = useState<number | null>(null);
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== "undefined" && !navigator.onLine);

  const orgId = specs[0]?.orgId ?? "";
  const anyServerData = specs.some((s) => s.serverRows.length > 0);
  // Cheap fingerprint so the effect below only re-runs when the actual row counts change, not on
  // every render (the specs array is rebuilt fresh by the caller each render).
  const fingerprint = specs.map((s) => `${s.table}:${s.serverRows.length}`).join("|");

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
    let cancelled = false;

    if (anyServerData) {
      const next = Object.fromEntries(specs.map((s) => [s.table, s.serverRows]));
      setData(next);
      setUsingCache(false);
      setCachedAt(null);
      specs.forEach((s) => { if (s.serverRows.length > 0) cacheRows(s.table, s.orgId, s.serverRows); });
      return;
    }

    // Nothing at all came from the server for any table — check the cache before assuming this
    // org genuinely has no data yet.
    (async () => {
      const results = await Promise.all(specs.map((s) => getCachedRows<Record<string, any>>(s.table, s.orgId)));
      if (cancelled) return;
      const anyCached = results.some((r) => r.length > 0);
      if (!anyCached) return; // genuinely nothing either way — leave the (empty) server rows as-is
      const next = Object.fromEntries(specs.map((s, i) => [s.table, results[i]]));
      setData(next);
      setUsingCache(true);
      const ages = results.flat().map((r: any) => r._cachedAt ?? 0);
      setCachedAt(ages.length ? Math.max(...ages) : null);
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, fingerprint]);

  return { data, usingCache, cachedAt, isOffline };
}
