"use client";

import { useEffect, useState } from "react";

// Small shared hook — several places (useLocalFirstList, useLocalFirstMulti) already had their own
// copy of this same online/offline listener pair inline. Phase 2 pages that read from Dexie as the
// primary source (lib/useLiveCachedTable.ts) don't get an "isOffline" flag for free the way those
// hooks did, since Dexie doesn't know or care whether the network is up — this fills that gap.
export function useOnlineStatus(): boolean {
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== "undefined" && !navigator.onLine);

  useEffect(() => {
    function goOnline() { setIsOffline(false); }
    function goOffline() { setIsOffline(true); }
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return isOffline;
}
