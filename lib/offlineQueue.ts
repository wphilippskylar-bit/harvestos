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
// retrying something that will never succeed — logged to the console for visibility since there's
// no error-reporting service wired up yet.
export async function flushQueue(): Promise<{ synced: number; remaining: number }> {
  const queue = readQueue();
  if (queue.length === 0) return { synced: 0, remaining: 0 };
  const supabase = createClient();
  let synced = 0;
  const remaining: PendingWrite[] = [];

  for (let i = 0; i < queue.length; i++) {
    const write = queue[i];
    try {
      const table = supabase.from(write.table);
      const { error } =
        write.op === "insert"
          ? await table.insert(write.payload)
          : await table.update(write.payload).eq(write.matchColumn!, write.matchValue!);
      if (error) throw error;
      synced++;
    } catch (err) {
      if (isNetworkError(err)) {
        // Still offline (or connection dropped mid-flush) — keep this and everything after it
        // queued rather than reordering syncs out of sequence.
        remaining.push(...queue.slice(i));
        break;
      }
      // eslint-disable-next-line no-console
      console.error("Dropping offline-queued write that the server rejected:", write, err);
    }
  }

  writeQueue(remaining);
  return { synced, remaining: remaining.length };
}
