import { getOrgContext, getBatches, getPurchases, getSales, getSalesChannels, getCrops, getGoals, getInventory, getMarketWatchlist, getProfitability, getDashboardPrefs } from "@/lib/data";
import { PageHeader, fmtCurrency } from "@/components/ui";
import type { WeeklyPoint } from "@/components/charts/RevenueCostChart";
import DashboardCards from "./DashboardCards";
import Link from "next/link";

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

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

  const totalRevenue = sales.reduce((a: number, s: any) => a + (s.total_revenue ?? s.quantity * s.unit_price), 0);
  const totalCost = purchases.reduce((a: number, p: any) => a + (p.total ?? 0), 0);
  const activeBatches = batches.filter((b: any) => b.status === "growing" || b.status === "germinating").length;
  const traysInProduction = batches
    .filter((b: any) => b.status === "growing" || b.status === "germinating")
    .reduce((a: number, b: any) => a + (b.tray_amount ?? 0), 0);

  const lowStockCrops = inventory.filter(
    (i: any) => i.low_stock_threshold_trays != null && i.sowable_trays_remaining != null && i.sowable_trays_remaining <= i.low_stock_threshold_trays
  );

  const latestMonth = profitability.monthlyPnl[0];

  // last 8 weeks revenue vs cost
  const weeks: WeeklyPoint[] = [];
  const now = new Date();
  for (let i = 7; i >= 0; i--) {
    const wStart = startOfWeek(new Date(now.getTime() - i * 7 * 86400000));
    const wEnd = new Date(wStart.getTime() + 7 * 86400000);
    const rev = sales
      .filter((s: any) => { const d = new Date(s.sale_date); return d >= wStart && d < wEnd; })
      .reduce((a: number, s: any) => a + (s.total_revenue ?? s.quantity * s.unit_price), 0);
    const cost = purchases
      .filter((p: any) => { const d = new Date(p.purchase_date); return d >= wStart && d < wEnd; })
      .reduce((a: number, p: any) => a + (p.total ?? 0), 0);
    weeks.push({ label: wStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }), revenue: rev, cost });
  }

  const cropMarginData = crops
    .filter((c: any) => c.seed_cost_per_g)
    .map((c: any) => ({
      crop: c.name.replace(/\s*\(.*?\)\s*/g, "").trim(),
      costPerTray: (c.seed_cost_per_g ?? 0) * 20 + 1.51 + 0.35, // rough est: 20g/tray avg + mat + clamshell
      premium: !!c.is_premium,
    }))
    .slice(0, 10);

  const channelCounts = channels.reduce((acc: Record<string, number>, c: any) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        title={`Welcome back${ctx.orgName ? `, ${ctx.orgName}` : ""}`}
        subtitle="Your farm at a glance — updates live as you log batches, purchases, and sales. Click any tile or chart to jump to that page."
      />

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
        <StatTile href="/channels" label="Sales channels" value={String(channels.length)} note={`${channelCounts.active ?? 0} active`} />
      </div>

      <DashboardCards
        cardOrder={dashboardPrefs.cardOrder}
        hiddenCards={dashboardPrefs.hiddenCards}
        weeks={weeks}
        channelCounts={channelCounts}
        cropMarginData={cropMarginData}
        goals={goals}
        latestMonth={latestMonth}
        marketWatchlist={marketWatchlist}
        batches={batches}
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
