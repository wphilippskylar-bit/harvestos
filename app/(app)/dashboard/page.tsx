import { getOrgContext, getBatches, getPurchases, getSales, getSalesChannels, getCrops, getGoals, getInventory, getMarketWatchlist, getProfitability, getDashboardPrefs } from "@/lib/data";
import DashboardClient from "./DashboardClient";

// Server component stays thin on purpose: it does the real fetch (fastest possible first paint
// when online) and hands the raw rows down as-is. All aggregation math and the offline-cache
// fallback live in DashboardClient.tsx / lib/dashboardCompute.ts so the same logic runs whether
// the numbers came fresh from the server or from the local cache (see the Dashboard local-first
// entry in HarvestOS_Offline_LocalFirst_Plan.md).
export default async function DashboardPage() {
  const ctx = await getOrgContext();
  const [batches, purchases, sales, channels, crops, goals, inventory, marketWatchlist, profitability, dashboardPrefs] = await Promise.all([
    getBatches(ctx.orgId),
    getPurchases(ctx.orgId),
    getSales(ctx.orgId),
    getSalesChannels(ctx.orgId),
    getCrops(ctx.orgId),
    getGoals(ctx.orgId),
    getInventory(ctx.orgId),
    getMarketWatchlist(ctx.orgId),
    getProfitability(ctx.orgId),
    getDashboardPrefs(ctx.userId, ctx.orgId),
  ]);

  return (
    <DashboardClient
      orgId={ctx.orgId}
      orgName={ctx.orgName}
      batches={batches}
      purchases={purchases}
      sales={sales}
      channels={channels}
      crops={crops}
      goals={goals}
      inventory={inventory}
      marketWatchlist={marketWatchlist}
      monthlyPnl={profitability.monthlyPnl}
      cardOrder={dashboardPrefs.cardOrder}
      hiddenCards={dashboardPrefs.hiddenCards}
    />
  );
}
