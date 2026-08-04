"use client";

import Link from "next/link";
import { PageHeader, fmtCurrency } from "@/components/ui";
import DashboardCards from "./DashboardCards";
import OfflineDataBanner from "@/components/OfflineDataBanner";
import { useLiveCachedTable } from "@/lib/useLiveCachedTable";
import { useOnlineStatus } from "@/lib/useOnlineStatus";
import { computeDashboardData } from "@/lib/dashboardCompute";

// Phase 5 of the local-first rewrite (see HarvestOS_Local_First_Rewrite_Plan.md) — the Dashboard
// was deliberately deferred from Phases 2/3 since it reads several tables at once rather than one.
// Previously used useLocalFirstMulti (fallback-only: Dexie only got read if the server handed down
// nothing). Now uses the same useLiveCachedTable hook as every other converted page, called once
// per table — that's fine here even though the set of tables is fixed per call site, same as any
// other hook. page.tsx still does the real server fetch for the fastest first paint when online;
// all the aggregation math lives in computeDashboardData so the exact same logic runs regardless
// of whether the inputs came from a fresh server render or straight from Dexie.
export default function DashboardClient({
  orgId, orgName,
  batches: serverBatches, purchases: serverPurchases, sales: serverSales, channels: serverChannels,
  crops: serverCrops, goals: serverGoals, inventory: serverInventory, marketWatchlist: serverMarketWatchlist, monthlyPnl: serverMonthlyPnl,
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
  const batches = useLiveCachedTable("batches", orgId, serverBatches);
  const purchases = useLiveCachedTable("purchases", orgId, serverPurchases);
  const sales = useLiveCachedTable("sales", orgId, serverSales);
  const channels = useLiveCachedTable("sales_channels", orgId, serverChannels);
  const crops = useLiveCachedTable("crops", orgId, serverCrops);
  const goals = useLiveCachedTable("goals", orgId, serverGoals);
  const inventory = useLiveCachedTable("crop_inventory", orgId, serverInventory);
  const marketWatchlist = useLiveCachedTable("market_watchlist", orgId, serverMarketWatchlist);
  const monthlyPnl = useLiveCachedTable("monthly_pnl", orgId, serverMonthlyPnl);
  const isOffline = useOnlineStatus();

  const {
    totalRevenue, totalCost, activeBatches, traysInProduction, lowStockCrops, latestMonth, weeks, cropMarginData, channelCounts,
  } = computeDashboardData({ batches, purchases, sales, channels, crops, inventory, monthlyPnl });

  const displayChannels = channels;
  const displayGoals = goals as any[];
  const displayWatchlist = marketWatchlist as any[];
  const displayBatches = batches as any[];

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

      <OfflineDataBanner usingCache={isOffline} cachedAt={null} />

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
