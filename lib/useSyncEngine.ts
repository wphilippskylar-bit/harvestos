"use client";

import { useEffect, useRef } from "react";
import { syncPull } from "@/lib/syncEngine";
import { flushQueue } from "@/lib/offlineQueue";
import { startRealtimeSync } from "@/lib/realtimeSync";

// Frequent enough that Dexie doesn't go stale for long during a normal work session, infrequent
// enough not to hammer a metered/shared connection with a full re-pull every few seconds.
const PULL_INTERVAL_MS = 5 * 60 * 1000;

// Mounted once (see components/SyncEngine.tsx, in app/(app)/layout.tsx). Runs a pull on mount,
// again whenever the browser comes back online, and on a 5-minute timer while it stays online —
// independent of which pages get visited, so Dexie stays warm for pages this session hasn't
// touched yet. Also flushes the offline write queue before each pull (same queue
// OfflineSyncBanner.tsx already flushes reactively on its own "online" listener — calling it again
// here is harmless, flushQueue is idempotent against an already-empty queue) so a pull right after
// reconnecting reflects this device's own queued writes, not stale pre-write data.
export function useSyncEngine(orgId: string) {
  const orgIdRef = useRef(orgId);
  orgIdRef.current = orgId;

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;

    async function runPull() {
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;
      await flushQueue().catch(() => {});
      if (!cancelled) await syncPull(orgIdRef.current).catch(() => {});
    }

    runPull();
    const interval = setInterval(runPull, PULL_INTERVAL_MS);
    function onOnline() { runPull(); }
    window.addEventListener("online", onOnline);

    // Phase 4 — Realtime subscription runs alongside the timer, not instead of it: Realtime covers
    // "notice a change fast while connected," the timer is the fallback for whatever Realtime
    // misses (a dropped websocket, a table that isn't Realtime-enabled yet, this tab having been
    // asleep/backgrounded when a change happened).
    const stopRealtime = startRealtimeSync(orgId);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("online", onOnline);
      stopRealtime();
    };
  }, [orgId]);
}
