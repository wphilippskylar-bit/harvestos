"use client";

import { useEffect } from "react";
import type { OrgContext } from "@/lib/data";
import { cacheOrgContext } from "@/lib/orgContextCache";

// Mounted once in app/(app)/layout.tsx. Every time the server successfully renders the shell (the
// common, online case), this stamps that context into localStorage so it's available instantly —
// synchronously, no network, no IndexedDB round trip — to any client component on a later visit,
// even before that visit's own server render (if any) has come back. This is the piece Phase 1+ of
// the local-first rewrite reads from via useOrgContext() below.
export default function OrgContextStamper({ ctx }: { ctx: OrgContext }) {
  useEffect(() => {
    if (ctx?.orgId) cacheOrgContext(ctx);
  }, [ctx]);

  return null;
}
