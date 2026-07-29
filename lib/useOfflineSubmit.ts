"use client";

import { useState } from "react";
import { enqueueWrite, isNetworkError, type PendingWrite } from "@/lib/offlineQueue";

type QueueSpec = Omit<PendingWrite, "id" | "createdAt">;

// Phase 3 of the offline plan (see project doc HarvestOS_Offline_LocalFirst_Plan.md): the
// try/catch → isNetworkError → enqueueWrite → "queued" state dance was previously hand-copied into
// every offline-capable form (Harvest, Grazing, Health log, Environmental log). This hook is that
// pattern, written once, so wiring a new form up for offline support is a few lines instead of
// duplicating the whole block — see EnvLogForm.tsx or HealthLogForm.tsx for the shape of that.
//
// It deliberately doesn't try to own the whole submit flow (some forms have extra steps around the
// write itself — HarvestForm skips a photo upload when offline, GrazingForm skips a rest-period
// check — those stay as form-specific code around the call to attemptOrQueue).
export function useOfflineSubmit() {
  const [queued, setQueued] = useState(false);

  // Returns a discriminated result rather than `T | undefined` — a successful attempt can itself
  // resolve to `undefined` (most of these are void inserts/updates), so that wouldn't reliably
  // tell a caller apart from "this got queued instead." { ok: true } means it actually saved;
  // { ok: false } means it's sitting in the offline queue now.
  async function attemptOrQueue<T>(
    attempt: () => Promise<T>,
    queueSpec: QueueSpec
  ): Promise<{ ok: true; value: T } | { ok: false }> {
    try {
      const value = await attempt();
      return { ok: true, value };
    } catch (err) {
      if (isNetworkError(err)) {
        enqueueWrite(queueSpec);
        setQueued(true);
        return { ok: false };
      }
      throw err;
    }
  }

  return { queued, setQueued, attemptOrQueue };
}
