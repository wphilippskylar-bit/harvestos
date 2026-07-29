// Scoped offline support: a local-storage queue for the handful of forms most likely to get
// used somewhere with bad signal (harvest entry, grazing log, animal health log — see
// HarvestForm.tsx / GrazingForm.tsx / HealthLogForm.tsx). This deliberately is NOT a general
// offline-sync engine: it only covers those specific forms, it has no conflict resolution (if the
// same record got edited elsewhere while this device was offline, whichever syncs last wins — an
// acceptable risk for one farmer entering their own field data, not something this queue tries to
// detect or merge), and every other form in the app still just fails outright with no connection.
// See the "offline/local-first support" discussion in the project docs for why it's scoped this
// narrowly rather than built as a full sync layer.

import { createClient } from "@/lib/supabase/client";

const STORAGE_KEY = "harvestos-offline-queue";

export type PendingWrite = {
  id: string;
  createdAt: string;
  label: string; // shown in the pending-sync UI, e.g. "Harvest — ACFMG-20260716-001"
  table: string;
  op: "insert" | "update";
  payload: Record<string, unknown>;
  // update-only: which row to update
  matchColumn?: string;
  matchValue?: string;
};

function readQueue(): PendingWrite[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PendingWrite[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: PendingWrite[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    window.dispatchEvent(new CustomEvent("harvestos-offline-queue-changed"));
  } catch {
    // localStorage full or unavailable — nothing more we can do here without a real
    // storage-quota strategy, which is out of scope for this scoped version.
  }
}

export function getQueue(): PendingWrite[] {
  return readQueue();
}

export function queueLength(): number {
  return readQueue().length;
}

export function enqueueWrite(write: Omit<PendingWrite, "id" | "createdAt">): void {
  const queue = readQueue();
  queue.push({ ...write, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
  writeQueue(queue);
}

// Best-effort check for "this failure means we're offline" vs. a real server-side rejection
// (bad data, RLS denial, etc.) — a network failure surfaces as a TypeError with no HTTP response
// at all, which is what fetch throws for a DNS/connection failure. Anything else (a 4xx/5xx with
// an actual error body) is a real error the form should show normally, not silently queue.
export function isNetworkError(err: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  if (err instanceof TypeError) return true;
  const message = err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : "";
  return /failed to fetch|network|load failed/i.test(message);
}

// Attempts every queued write in order; stops at the first failure that still looks like a
// connectivity problem (so it retries cleanly next time), but skips-and-drops a write that the
// server actively rejects (e.g. a row deleted elsewhere in the meantime) rather than getting stuck
// retrying something that will never succeed.
//
// This is also the one place "conflict handling" lives for this app (Phase 4 of the offline plan —
// see HarvestOS_Offline_LocalFirst_Plan.md in the project docs): since this is one farmer entering
// their own data rather than a team editing the same records concurrently, the deliberate choice is
// last-write-wins with no merge logic — a queued `update` just overwrites whatever's on the server
// when it finally syncs. The one thing that *does* need to reach the user is a write the server
// flatly refused (not "offline", an actual rejection — e.g. the row it targeted got deleted from
// another device in the meantime); those are returned as `dropped` so the caller can surface them
// instead of the entry just silently vanishing from the queue.
//
// The queue is persisted after every single write, not just once at the end — if the flush gets
// interrupted partway (tab closed, connection drops mid-sync), whatever already synced is already
// removed from local storage, so resuming later can't accidentally resubmit it and create a
// duplicate row.
export async function flushQueue(): Promise<{ synced: number; remaining: number; dropped: PendingWrite[] }> {
  let queue = readQueue();
  if (queue.length === 0) return { synced: 0, remaining: 0, dropped: [] };
  const supabase = createClient();
  let synced = 0;
  const dropped: PendingWrite[] = [];

  while (queue.length > 0) {
    const write = queue[0];
    try {
      const table = supabase.from(write.table);
      const { error } =
        write.op === "insert"
          ? await table.insert(write.payload)
          : await table.update(write.payload).eq(write.matchColumn!, write.matchValue!);
      if (error) throw error;
      synced++;
      queue = queue.slice(1);
      writeQueue(queue);
    } catch (err) {
      if (isNetworkError(err)) {
        // Still offline (or connection dropped mid-flush) — stop here, everything from this write
        // onward stays queued in the order it was entered.
        break;
      }
      // A real rejection, not a connectivity problem — drop it rather than retrying something
      // that will never succeed, but tell the caller so this doesn't just vanish silently.
      dropped.push(write);
      queue = queue.slice(1);
      writeQueue(queue);
    }
  }

  return { synced, remaining: queue.length, dropped };
}
