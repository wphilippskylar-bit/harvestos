"use client";

import Link from "next/link";
import { PageHeader, fmtCurrency } from "@/components/ui";
import DashboardCards from "./DashboardCards";
import OfflineDataBanner from "@/components/OfflineDataBanner";
import { useLocalFirstMulti } from "@/lib/useLocalFirstMulti";
import { computeDashboardData } from "@/lib/dashboardCompute";

// Dashboard local-first conversion (the page deliberately deferred from the rest of the offline
// plan — see HarvestOS_Offline_LocalFirst_Plan.md). page.tsx still does the real server fetch for
// the fastest first paint when online; all the aggregation math and the offline-cache fallback
// live here so the exact same computeDashboardData logic runs whether the inputs came fresh from
// the server or from the local cache.
export default function DashboardClient({
  orgId, orgName,
  batches, purchases, sales, channels, crops, goals, inventory, marketWatchlist, monthlyPnl,
  cardOrder, hiddenCards,
}: {
  orgId: string;
  orgName: string | null;
  batches: any[];
  purchases: any[];
  sales: any[];
  channels: any[];
  crops: any[];
  goals: any[];
  inventory: any[];
  marketWatchlist: any[];
  monthlyPnl: any[];
  cardOrder: string[] | null;
  hiddenCards: string[];
}) {
  const { data, usingCache, cachedAt } = useLocalFirstMulti([
    { table: "batches", orgId, serverRows: batches },
    { table: "purchases", orgId, serverRows: purchases },
    { table: "sales", orgId, serverRows: sales },
    { table: "sales_channels", orgId, serverRows: channels },
    { table: "crops", orgId, serverRows: crops },
    { table: "goals", orgId, serverRows: goals },
    { table: "crop_inventory", orgId, serverRows: inventory },
    { table: "market_watchlist", orgId, serverRows: marketWatchlist },
    { table: "monthly_pnl", orgId, serverRows: monthlyPnl },
  ]);

  const {
    totalRevenue, totalCost, activeBatches, traysInProduction, lowStockCrops, latestMonth, weeks, cropMarginData, channelCounts,
  } = computeDashboardData({
    batches: data.batches ?? [],
    purchases: data.purchases ?? [],
    sales: data.sales ?? [],
    channels: data.sales_channels ?? [],
    crops: data.crops ?? [],
    inventory: data.crop_inventory ?? [],
    monthlyPnl: data.monthly_pnl ?? [],
  });

  const displayChannels = data.sales_channels ?? [];
  const displayGoals = (data.goals ?? []) as any[];
  const displayWatchlist = (data.market_watchlist ?? []) as any[];
  const displayBatches = (data.batches ?? []) as any[];

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeader
          title={`Welcome back${orgName ? `, ${orgName}` : ""}`}
          subtitle="Your farm at a glance — updates live as you log batches, purchases, and sales. Click any tile or chart to jump to that page."
        />
        <Link href="/import" className="btn-secondary whitespace-nowrap !mt-1">
          Import / Export data
        </Link>
      </div>

      <OfflineDataBanner usingCache={usingCache} cachedAt={cachedAt} />

      {lowStockCrops.length > 0 && (
        <div className="card p-4 mb-6 border-l-4 border-red-400 bg-red-50/50 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="font-semibold text-red-700 text-sm">Low on seed inventory</div>
            <p className="text-sm text-red-600 mt-0.5">
              {lowStockCrops.map((i: any) => i.crop_name).join(", ")} — below the tray threshold you set.
            </p>
          </div>
          <Link href="/inventory" className="text-xs font-medium text-red-700 hover:underline whitespace-nowrap">Go to Inventory →</Link>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <StatTile href="/sales" label="Total revenue" value={fmtCurrency(totalRevenue)} />
        <StatTile href="/purchases" label="Total costs" value={fmtCurrency(totalCost)} />
        <StatTile href="/batches" label="Trays in production" value={String(traysInProduction)} note={`${activeBatches} active batch${activeBatches === 1 ? "" : "es"}`} />
        <StatTile href="/channels" label="Sales channels" value={String(displayChannels.length)} note={`${channelCounts.active ?? 0} active`} />
      </div>

      <DashboardCards
        cardOrder={cardOrder}
        hiddenCards={hiddenCards}
        weeks={weeks}
        channelCounts={channelCounts}
        cropMarginData={cropMarginData}
        goals={displayGoals}
        latestMonth={latestMonth}
        marketWatchlist={displayWatchlist}
        batches={displayBatches}
      />
    </div>
  );
}

function StatTile({ href, label, value, note }: { href: string; label: string; value: string; note?: string }) {
  return (
    <Link href={href} className="card p-4 block hover:ring-1 hover:ring-brand-300 transition-shadow">
      <div className="text-xs font-medium text-stone-500">{label}</div>
      <div className="text-xl md:text-2xl font-extrabold text-stone-900 mt-1">{value}</div>
      {note && <div className="text-xs text-stone-400 mt-0.5">{note}</div>}
    </Link>
  );
}
