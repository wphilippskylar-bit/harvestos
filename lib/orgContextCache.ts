"use client";

// Phase 0 of the local-first rewrite (see HarvestOS_Local_First_Rewrite_Plan.md in the project
// docs). The org context (who's signed in, which farm, their role/settings) currently only exists
// as something the server hands down on each full page load — every client page that needs it
// (nav labels, unit preferences, role-gated UI) either has to wait on that same server round trip
// or thread the prop down through the tree. This gives every later phase (Dexie-backed pages that
// render without waiting on the server at all) a synchronous, client-side place to read it from —
// no network, no IndexedDB round trip, just localStorage, so it's available on the very first
// render of any client component that needs it.
//
// This is a cache, not a source of truth: whatever the server last successfully sent down is what
// gets stored here, and every server render re-stamps it. If the cached value here and the
// server's are ever out of sync (a setting changed on another device), the next successful server
// round trip corrects it — same "last write from the server wins" posture as the rest of the
// offline work.

import type { OrgContext } from "@/lib/data";

const KEY = "harvestos-org-context";

export function cacheOrgContext(ctx: OrgContext): void {
  if (typeof window === "undefined" || !ctx?.orgId) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ctx, cachedAt: Date.now() }));
  } catch {
    // Best-effort — localStorage full/unavailable shouldn't break anything real.
  }
}

export function getCachedOrgContext(): { ctx: OrgContext; cachedAt: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { ctx: OrgContext; cachedAt: number };
  } catch {
    return null;
  }
}

// Clears the cache on sign-out so the next person to use this browser/device never sees a stale
// farm's context, even for an instant before a fresh server render lands.
export function clearCachedOrgContext(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    // no-op
  }
}
