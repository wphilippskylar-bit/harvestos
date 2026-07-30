"use client";

import { useState } from "react";
import type { OrgContext } from "@/lib/data";
import { getCachedOrgContext } from "@/lib/orgContextCache";

// The client-side read side of Phase 0 (see HarvestOS_Local_First_Rewrite_Plan.md). A page that's
// been converted to a client component (Phase 1+) still gets its org context from a server-rendered
// prop when the server round trip succeeds — but for a page rendering from the local cache with no
// server prop available (offline, or a page whose own server fetch hasn't resolved yet), this reads
// the last-known-good context synchronously from localStorage instead of leaving orgId blank.
//
// `serverCtx` should be passed whenever the caller has one (even a possibly-stale one from a cached
// RSC payload) — it always wins over the cache, since it's what actually reached this render. This
// hook only fills the gap when there's nothing better.
export function useOrgContext(serverCtx?: OrgContext | null): OrgContext | null {
  const [cached] = useState(() => getCachedOrgContext()?.ctx ?? null);
  return serverCtx ?? cached;
}
