"use client";

import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { cacheRows, getCachedRows, type CachedTable } from "@/lib/localDb";

// Phase 2 of the local-first rewrite (see HarvestOS_Local_First_Rewrite_Plan.md). Where
// useLocalFirstList (the earlier offline work) only reads Dexie as a fallback when the server
// hands down nothing, this makes Dexie the primary, continuously-live source a page renders from.
// Phase 1's background sync engine and this session's own writes both land in the same Dexie
// table, and useLiveQuery re-renders the page automatically the instant either one changes — no
// router.refresh() or manual re-fetch needed to see your own saved batch, or a change synced down
// from another device.
//
// `serverRows`, when present (this render's own server round trip succeeded), is still mirrored
// into Dexie — same as before, it counts as the freshest read available. The difference is
// rendering never *waits* on that round trip: Dexie already has whatever the last successful sync
// left there, so there's always something to show immediately.
export function useLiveCachedTable<T extends { id: string }>(
  table: CachedTable,
  orgId: string,
  serverRows?: T[]
): T[] {
  useEffect(() => {
    if (orgId && serverRows && serverRows.length > 0) {
      cacheRows(table, orgId, serverRows as unknown as Record<string, any>[]);
    }
  }, [table, orgId, serverRows]);

  const rows = useLiveQuery(
    () => (orgId ? getCachedRows<T>(table, orgId) : Promise.resolve([] as T[])),
    [table, orgId],
    serverRows ?? []
  );

  return rows ?? serverRows ?? [];
}
