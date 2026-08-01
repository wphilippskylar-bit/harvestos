"use client";

import { useSyncEngine } from "@/lib/useSyncEngine";

// No UI — just runs the Phase 1 background pull (see lib/useSyncEngine.ts / lib/syncEngine.ts).
export default function SyncEngine({ orgId }: { orgId: string }) {
  useSyncEngine(orgId);
  return null;
}
