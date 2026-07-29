"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { flushQueue, queueLength } from "@/lib/offlineQueue";

// Mounted globally (app/(app)/layout.tsx) alongside FeedbackWidget. Shows nothing when the queue
// is empty — the common case. When a harvest/grazing/health-log entry got saved locally instead of
// to the server (see offlineQueue.ts and the three forms that use it), this surfaces that fact
// (so it's never a silent, easy-to-forget state) and retries automatically the moment the browser
// reports the connection is back, with a manual "Sync now" fallback in case that event is flaky.
export default function OfflineSyncBanner() {
  const router = useRouter();
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [droppedLabels, setDroppedLabels] = useState<string[]>([]);

  const refreshCount = useCallback(() => setPending(queueLength()), []);

  const sync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    setLastResult(null);
    try {
      const { synced, remaining, dropped } = await flushQueue();
      setPending(remaining);
      if (dropped.length > 0) {
        // The server actively rejected these (not a connectivity issue) — most likely whatever
        // they referenced (a batch, an animal) was deleted elsewhere while this device was
        // offline. Surfacing this matters: silently dropping a queued entry would mean data the
        // user thinks got saved just quietly never existed.
        setDroppedLabels(dropped.map((w) => w.label));
      }
      if (synced > 0) {
        setLastResult(`Synced ${synced} ${synced === 1 ? "entry" : "entries"}.`);
        router.refresh();
        setTimeout(() => setLastResult(null), 5000);
      }
    } finally {
      setSyncing(false);
    }
  }, [syncing, router]);

  useEffect(() => {
    refreshCount();
    window.addEventListener("harvestos-offline-queue-changed", refreshCount);
    window.addEventListener("online", sync);
    // Also try once on mount in case the tab was reopened already-online with a stale queue.
    if (typeof navigator !== "undefined" && navigator.onLine) sync();
    return () => {
      window.removeEventListener("harvestos-offline-queue-changed", refreshCount);
      window.removeEventListener("online", sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (pending === 0 && !lastResult && droppedLabels.length === 0) return null;

  return (
    <div className="fixed bottom-5 left-5 z-50 print:hidden space-y-2">
      {droppedLabels.length > 0 && (
        <div className="card px-4 py-3 max-w-xs shadow-lg border-red-200 bg-red-50">
          <div className="text-sm font-medium text-red-800">
            Couldn't save {droppedLabels.length === 1 ? "an entry" : `${droppedLabels.length} entries`} saved while offline
          </div>
          <p className="text-xs text-red-700 mt-0.5">
            The server rejected {droppedLabels.length === 1 ? "it" : "them"} — most likely whatever{" "}
            {droppedLabels.length === 1 ? "it" : "they"} referenced (a batch, an animal) was deleted
            elsewhere in the meantime: {droppedLabels.join(", ")}.
          </p>
          <button className="btn-secondary !py-1 !px-2 text-xs mt-2" onClick={() => setDroppedLabels([])}>
            Dismiss
          </button>
        </div>
      )}
      {(pending > 0 || lastResult) && (
        <div className="card px-4 py-3 max-w-xs shadow-lg border-amber-200 bg-amber-50">
          {pending > 0 ? (
            <>
              <div className="text-sm font-medium text-amber-800">
                {pending} {pending === 1 ? "entry" : "entries"} saved locally
              </div>
              <p className="text-xs text-amber-700 mt-0.5">
                Logged while offline — will upload automatically once you're back online.
              </p>
              <button
                className="btn-secondary !py-1 !px-2 text-xs mt-2"
                onClick={sync}
                disabled={syncing}
              >
                {syncing ? "Syncing…" : "Sync now"}
              </button>
            </>
          ) : (
            <div className="text-sm font-medium text-emerald-700">{lastResult}</div>
          )}
        </div>
      )}
    </div>
  );
}
