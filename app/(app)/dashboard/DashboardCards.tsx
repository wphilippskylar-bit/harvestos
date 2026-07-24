"use client";

import Link from "next/link";
import { fmtCurrency2 } from "@/components/ui";
import RevenueCostChart, { type WeeklyPoint } from "@/components/charts/RevenueCostChart";
import CropMarginChart from "@/components/charts/CropMarginChart";
import ChannelStatusChart from "@/components/charts/ChannelStatusChart";

export const DASHBOARD_CARDS = [
  { key: "revenue_cost_chart", label: "Revenue vs. cost chart" },
  { key: "channel_pipeline", label: "Sales channel pipeline" },
  { key: "crop_margin", label: "Cost per tray by crop" },
  { key: "goals", label: "Goals" },
  { key: "profitability", label: "Profitability summary" },
  { key: "market", label: "Market Prices" },
  { key: "recent_batches", label: "Recent batches" },
];

type Goal = { id: string; title: string; target_value: number | null; current_value: number };
type WatchlistItem = { id: string; report_title: string };
type Batch = { id: string; batch_id: string; crop_name_snapshot: string; tray_amount: number; plant_date: string; status: string };
type LatestMonth = { month: string; net_revenue: number; copex: number; profit: number } | undefined;

export default function DashboardCards({
  cardOrder, hiddenCards,
  weeks, channelCounts, cropMarginData, goals, latestMonth, marketWatchlist, batches,
}: {
  cardOrder: string[] | null;
  hiddenCards: string[];
  weeks: WeeklyPoint[];
  channelCounts: Record<string, number>;
  cropMarginData: { crop: string; costPerTray: number; premium: boolean }[];
  goals: Goal[];
  latestMonth: LatestMonth;
  marketWatchlist: WatchlistItem[];
  batches: Batch[];
}) {
  const order = cardOrder && cardOrder.length > 0
    ? [...cardOrder.filter((k) => DASHBOARD_CARDS.some((c) => c.key === k)), ...DASHBOARD_CARDS.map((c) => c.key).filter((k) => !cardOrder.includes(k))]
    : DASHBOARD_CARDS.map((c) => c.key);
  const visible = order.filter((k) => !hiddenCards.includes(k));

  const cardsByKey: Record<string, React.ReactNode> = {
    revenue_cost_chart: (
      <Link href="/profitability" className="card p-5 block hover:ring-1 hover:ring-brand-300 transition-shadow">
        <h2 className="font-semibold text-stone-800 mb-1">Revenue vs. cost — last 8 weeks</h2>
        <p className="text-xs text-stone-400 mb-3">From your Sales and Purchases logs. Click for the full Profitability breakdown.</p>
        <RevenueCostChart data={weeks} />
      </Link>
    ),
    channel_pipeline: (
      <Link href="/channels" className="card p-5 block hover:ring-1 hover:ring-brand-300 transition-shadow">
        <h2 className="font-semibold text-stone-800 mb-1">Sales channel pipeline</h2>
        <p className="text-xs text-stone-400 mb-3">Untried → Attempted → In Progress → Active.</p>
        <ChannelStatusChart counts={channelCounts} />
      </Link>
    ),
    crop_margin: (
      <Link href="/profitability" className="card p-5 block hover:ring-1 hover:ring-brand-300 transition-shadow">
        <h2 className="font-semibold text-stone-800 mb-1">Cost per tray by crop</h2>
        <p className="text-xs text-stone-400 mb-3">Gold = premium/specialty crop. Lower is better margin.</p>
        <CropMarginChart data={cropMarginData} />
      </Link>
    ),
    goals: (
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-stone-800">Goals</h2>
          <Link href="/goals" className="text-xs font-medium text-brand-700 hover:underline">View all →</Link>
        </div>
        <div className="space-y-4">
          {goals.length === 0 && <p className="text-sm text-stone-400">No goals set yet.</p>}
          {goals.slice(0, 3).map((g) => {
            const pct = Math.min(100, g.target_value ? (g.current_value / g.target_value) * 100 : 0);
            return (
              <Link href="/goals" key={g.id} className="block">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-stone-700">{g.title}</span>
                  <span className="text-stone-400">{Math.round(pct)}%</span>
                </div>
                <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                  <div className="h-full bg-brand-600 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    ),
    profitability: (
      <Link href="/profitability" className="card p-5 block hover:ring-1 hover:ring-brand-300 transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-stone-800">Profitability</h2>
          <span className="text-xs font-medium text-brand-700">View all →</span>
        </div>
        {latestMonth ? (
          <div>
            <p className="text-xs text-stone-400 mb-2">
              {new Date(latestMonth.month).toLocaleDateString(undefined, { year: "numeric", month: "long" })}
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-xs text-stone-400">Revenue</div>
                <div className="font-semibold text-stone-800">{fmtCurrency2(latestMonth.net_revenue)}</div>
              </div>
              <div>
                <div className="text-xs text-stone-400">Costs</div>
                <div className="font-semibold text-stone-800">{fmtCurrency2(latestMonth.copex)}</div>
              </div>
              <div>
                <div className="text-xs text-stone-400">Profit</div>
                <div className={`font-semibold ${latestMonth.profit >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                  {fmtCurrency2(latestMonth.profit)}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-stone-400">No P&amp;L data yet — log purchases and sales to see this fill in.</p>
        )}
      </Link>
    ),
    market: (
      <Link href="/market" className="card p-5 block hover:ring-1 hover:ring-brand-300 transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-stone-800">Market Prices</h2>
          <span className="text-xs font-medium text-brand-700">View all →</span>
        </div>
        {marketWatchlist.length === 0 ? (
          <p className="text-sm text-stone-400">
            No pinned reports yet — search USDA commodity prices on the Market Prices page and pin
            the ones you check often.
          </p>
        ) : (
          <div className="space-y-1.5">
            {marketWatchlist.slice(0, 5).map((w) => (
              <div key={w.id} className="text-sm text-stone-600">{w.report_title}</div>
            ))}
          </div>
        )}
      </Link>
    ),
    recent_batches: (
      <Link href="/batches" className="card p-5 block hover:ring-1 hover:ring-brand-300 transition-shadow">
        <h2 className="font-semibold text-stone-800 mb-3">Recent batches</h2>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-stone-400 uppercase tracking-wide">
                <th className="pb-2 pr-4">Batch ID</th>
                <th className="pb-2 pr-4">Crop</th>
                <th className="pb-2 pr-4">Trays</th>
                <th className="pb-2 pr-4">Planted</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {batches.slice(0, 6).map((b) => (
                <tr key={b.id}>
                  <td className="py-2 pr-4 font-mono text-xs text-stone-500">{b.batch_id}</td>
                  <td className="py-2 pr-4">{b.crop_name_snapshot}</td>
                  <td className="py-2 pr-4">{b.tray_amount}</td>
                  <td className="py-2 pr-4 text-stone-500">{b.plant_date}</td>
                  <td className="py-2 capitalize text-stone-500">{b.status}</td>
                </tr>
              ))}
              {batches.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-stone-400">No batches yet — add one from the Batches tab.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Link>
    ),
  };

  // Pair up cards two-at-a-time into the existing lg:grid-cols-2 rows, except "recent_batches"
  // which has always been a full-width row on its own — keep that true no matter where it sits
  // in the custom order.
  const rows: React.ReactNode[] = [];
  let pending: string[] = [];
  function flushPending() {
    if (pending.length === 0) return;
    rows.push(
      <div key={`row-${rows.length}`} className="grid lg:grid-cols-2 gap-4 mb-6">
        {pending.map((k) => <div key={k}>{cardsByKey[k]}</div>)}
      </div>
    );
    pending = [];
  }
  for (const key of visible) {
    if (!cardsByKey[key]) continue;
    if (key === "recent_batches") {
      flushPending();
      rows.push(<div key={key} className="mb-6 last:mb-0">{cardsByKey[key]}</div>);
    } else {
      pending.push(key);
      if (pending.length === 2) flushPending();
    }
  }
  flushPending();

  return <>{rows}</>;
}
