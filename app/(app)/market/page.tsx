import { getOrgContext, getMarketWatchlist } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import MarketClient from "./MarketClient";

export default async function MarketPage() {
  const ctx = await getOrgContext();
  const watchlist = await getMarketWatchlist(ctx.orgId);
  const isEditor = ctx.role === "owner" || ctx.role === "admin" || ctx.role === "member";

  return (
    <div>
      <PageHeader
        title="Market Prices"
        subtitle="Live USDA commodity pricing — free, straight from USDA's own market news service. Pin the reports you check often."
      />
      <MarketClient orgId={ctx.orgId} watchlist={watchlist} isEditor={isEditor} />
    </div>
  );
}
