"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";
import { errorMessage } from "@/lib/errors";
import { EmptyState } from "@/components/ui";
import OfflineDataBanner from "@/components/OfflineDataBanner";
import { useLiveCachedTable } from "@/lib/useLiveCachedTable";
import { useOnlineStatus } from "@/lib/useOnlineStatus";

type Report = {
  slug_id: string;
  report_title: string;
  market_types?: string[];
  office_name?: string;
  office_city?: string;
  office_state?: string;
};

type WatchlistItem = { id: string; report_slug: string; report_title: string };

const QUICK_FILTERS = [
  { label: "Feeder cattle", q: "Feeder Cattle" },
  { label: "Slaughter cattle", q: "Slaughter Cattle" },
  { label: "Hogs", q: "Hogs" },
  { label: "Hay", q: "Hay" },
  { label: "Fruits & vegetables", q: "Specialty Crops" }, // USDA's own category name — see route.ts
];

export default function MarketClient({ orgId, watchlist: serverWatchlist, isEditor }: { orgId: string; watchlist: WatchlistItem[]; isEditor: boolean }) {
  const supabase = createClient();
  const router = useRouter();
  // Phase 5 of the local-first rewrite (see HarvestOS_Local_First_Rewrite_Plan.md). Only the
  // pinned-reports watchlist is DB-backed and cacheable this way — the actual USDA price data
  // below (reports/rows, fetched via /api/market/*) is a live external feed with no offline story,
  // same as before this change.
  const watchlist = useLiveCachedTable("market_watchlist", orgId, serverWatchlist);
  const isOffline = useOnlineStatus();
  const [query, setQuery] = useState("");
  const [reports, setReports] = useState<Report[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);

  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState<string>("");
  const [rows, setRows] = useState<any[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [searched, setSearched] = useState(false);

  async function search(q: string) {
    setQuery(q);
    setSearching(true);
    setError(null);
    setNotConfigured(false);
    setSearched(true);
    try {
      const res = await fetch(`/api/market/reports?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (res.status === 501) { setNotConfigured(true); setReports([]); return; }
      if (!res.ok) throw new Error(data.error || "Search failed");
      setReports(data.reports ?? []);
    } catch (err) {
      setError(errorMessage(err, "Could not search USDA market reports"));
    } finally {
      setSearching(false);
    }
  }

  async function viewReport(slug: string, title: string) {
    setActiveSlug(slug);
    setActiveTitle(title);
    setLoadingRows(true);
    setError(null);
    setNotConfigured(false);
    try {
      const res = await fetch(`/api/market/report/${encodeURIComponent(slug)}`);
      const data = await res.json();
      if (res.status === 501) { setNotConfigured(true); setRows([]); return; }
      if (!res.ok) throw new Error(data.error || "Could not load report");
      setRows(data.results ?? []);
    } catch (err) {
      setError(errorMessage(err, "Could not load report data"));
    } finally {
      setLoadingRows(false);
    }
  }

  async function pinReport(r: Report) {
    if (DEMO_MODE) return;
    await supabase.from("market_watchlist").insert({ org_id: orgId, report_slug: r.slug_id, report_title: r.report_title });
    router.refresh();
  }

  async function unpin(id: string) {
    if (DEMO_MODE) return;
    await supabase.from("market_watchlist").delete().eq("id", id);
    router.refresh();
  }

  const isPinned = (slug: string) => watchlist.some((w) => w.report_slug === slug);

  // USDA reports don't return a fixed schema — which fields exist (and their order) varies by
  // report, and the price/commodity fields aren't reliably first. The old version only showed the
  // first 8 keys of the first row, which for many reports meant nothing but report/office metadata
  // (report_date, office_name, etc.) ever showed up and the actual prices were silently cut off.
  // Fix: union the keys across every row (in case rows have slightly different fields) and show
  // everything — the table already scrolls horizontally, so there's no need to truncate.
  const [showAllColumns, setShowAllColumns] = useState(false);

  const columns: string[] = rows.length > 0
    ? Array.from(rows.reduce((set: Set<string>, row) => { Object.keys(row).forEach((k) => set.add(k)); return set; }, new Set<string>()))
    : [];

  // Every USDA report field, no matter how obscure, was showing at once — which is a lot for
  // someone who just wants to know "what's the price today." Pick out the handful of columns a
  // typical farmer/rancher actually cares about (date, price, count/head, quality/grade) by
  // keyword match against whatever this report's field names are, and default to just those, with
  // an "Show all columns" toggle for anyone who wants the full USDA report.
  // Price/rate columns go FIRST and are never budget-limited — that's the actual number a farmer
  // opened this report to see. Everything else (dates, head count, grade/class, weight) fills in
  // after, capped so the default view doesn't get overwhelming. Previously date-ish columns were
  // checked before price columns and there's often more than one USDA date field (report_date,
  // begin_date, end_date, published_date…) — those alone could fill the whole 6-column budget
  // before a single price column was ever added, which is exactly the "missing prices" bug.
  const PRICE_PATTERNS = [/price/i, /rate/i, /\bavg\b/i, /wtd/i];
  const OTHER_PATTERNS = [
    /^report_date$/i, /date/i,
    /head/i, /count/i, /qty|quantity|receipts/i,
    /grade/i, /quality/i, /class/i, /weight/i, /commodity/i, /market_location/i,
  ];
  const priorityColumns = (() => {
    const priceMatches: string[] = [];
    for (const pattern of PRICE_PATTERNS) {
      for (const c of columns) {
        if (pattern.test(c) && !priceMatches.includes(c)) priceMatches.push(c);
      }
    }
    const OTHER_BUDGET = 6;
    const otherMatches: string[] = [];
    for (const pattern of OTHER_PATTERNS) {
      for (const c of columns) {
        if (otherMatches.length >= OTHER_BUDGET) break;
        if (pattern.test(c) && !priceMatches.includes(c) && !otherMatches.includes(c)) otherMatches.push(c);
      }
    }
    const combined = [...priceMatches, ...otherMatches];
    return combined.length > 0 ? combined : columns.slice(0, 6);
  })();
  const displayColumns = showAllColumns ? columns : priorityColumns;
  const hasMoreColumns = columns.length > priorityColumns.length;
  const isPriceColumn = (c: string) => PRICE_PATTERNS.some((p) => p.test(c));

  return (
    <div className="space-y-4">
      <OfflineDataBanner usingCache={isOffline} cachedAt={null} />
      {notConfigured && (
        <div className="card p-5 bg-amber-50 border border-amber-200">
          <p className="text-sm text-amber-800">
            Live market pricing isn&apos;t set up yet — it needs a free USDA API key. See the
            &quot;Market Prices&quot; section in the README for the 5-minute signup steps, then add
            the key as <code className="font-mono">USDA_MARS_API_KEY</code> in Vercel&apos;s
            environment variables.
          </p>
        </div>
      )}

      {watchlist.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100">
            <h3 className="font-semibold text-stone-800">Pinned reports</h3>
          </div>
          <div className="divide-y divide-stone-100">
            {watchlist.map((w) => (
              <div key={w.id} className="px-5 py-2.5 flex items-center justify-between text-sm">
                <button className="font-medium text-brand-700 hover:underline text-left" onClick={() => viewReport(w.report_slug, w.report_title)}>
                  {w.report_title}
                </button>
                {isEditor && (
                  <button className="text-xs text-red-600 hover:underline" onClick={() => unpin(w.id)}>Unpin</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-5">
        <div className="flex flex-wrap gap-2 mb-3">
          {QUICK_FILTERS.map((f) => (
            <button key={f.q} className="btn-secondary !py-1 !px-3 text-xs" onClick={() => search(f.q)}>
              {f.label}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); search(query); }}
          className="flex gap-2"
        >
          <input
            className="input flex-1"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a commodity — e.g. Watermelons, Feeder Cattle, Hay…"
          />
          <button className="btn-primary" type="submit" disabled={searching}>{searching ? "Searching…" : "Search"}</button>
        </form>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>

      {searched && !searching && !notConfigured && reports.length === 0 && !error && (
        <div className="card p-5">
          <p className="text-sm text-stone-400">
            No USDA reports matched &quot;{query}&quot; — try a broader term (e.g. just the animal
            or crop name, like &quot;cattle&quot; or &quot;tomatoes&quot;, rather than a full report
            name).
          </p>
        </div>
      )}

      {reports.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100">
            <h3 className="font-semibold text-stone-800">Matching USDA reports</h3>
          </div>
          <div className="divide-y divide-stone-100">
            {reports.map((r) => (
              <div key={r.slug_id} className="px-5 py-2.5 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <button className="font-medium text-brand-700 hover:underline text-left" onClick={() => viewReport(r.slug_id, r.report_title)}>
                    {r.report_title}
                  </button>
                  <div className="text-xs text-stone-400 truncate">
                    {r.office_name}{r.office_city ? ` · ${r.office_city}, ${r.office_state}` : ""}
                  </div>
                </div>
                {isEditor && (
                  <button
                    className="text-xs font-medium text-brand-700 hover:underline shrink-0"
                    onClick={() => pinReport(r)}
                    disabled={isPinned(r.slug_id)}
                  >
                    {isPinned(r.slug_id) ? "Pinned" : "Pin"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSlug && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-stone-800">{activeTitle}</h3>
              <p className="text-xs text-stone-400 mt-0.5">Live from USDA — refreshed roughly every 15 minutes.</p>
            </div>
            {rows.length > 0 && hasMoreColumns && (
              <button
                className="text-xs font-medium text-brand-700 hover:underline shrink-0"
                onClick={() => setShowAllColumns((v) => !v)}
              >
                {showAllColumns ? "Show fewer columns" : "Show all columns"}
              </button>
            )}
          </div>
          {loadingRows ? (
            <div className="px-5 py-4"><p className="text-sm text-stone-400">Loading…</p></div>
          ) : rows.length === 0 ? (
            <div className="px-5 py-4"><EmptyState title="No current data for this report" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-xs text-stone-500 uppercase tracking-wide">
                  <tr>
                    {displayColumns.map((c) => (
                      <th
                        key={c}
                        className={`text-left py-3 px-4 whitespace-nowrap ${isPriceColumn(c) ? "text-brand-700" : ""}`}
                      >
                        {c.replace(/_/g, " ")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {rows.slice(0, 50).map((row, i) => (
                    <tr key={i}>
                      {displayColumns.map((c) => (
                        <td
                          key={c}
                          className={`py-2 px-4 whitespace-nowrap ${isPriceColumn(c) ? "font-semibold text-brand-700" : "text-stone-600"}`}
                        >
                          {String(row[c] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
