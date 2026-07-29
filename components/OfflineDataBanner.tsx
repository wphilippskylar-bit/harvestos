"use client";

// Small, reusable banner for pages wired into the local-first read path (see
// lib/useLocalFirstList.ts). Only renders when there's actually something worth saying — offline
// with fresh-enough server data doesn't need a banner, only "what you're looking at right now came
// from the local cache, as of [time]" does.
export default function OfflineDataBanner({ usingCache, cachedAt }: { usingCache: boolean; cachedAt: number | null }) {
  if (!usingCache) return null;

  const when = cachedAt
    ? new Date(cachedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : null;

  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
      Showing saved data{when ? ` from ${when}` : ""} — couldn't reach the server just now. This will
      refresh automatically once you're back online.
    </div>
  );
}
