// Pure aggregation logic for the Dashboard — pulled out of the page component so it can run in two
// places identically: on the server (page.tsx, for the fastest possible first paint when online)
// and on the client (DashboardClient.tsx, when falling back to locally-cached data offline). Same
// inputs must always produce the same outputs regardless of which side runs it, so this stays free
// of anything environment-specific (no fetches, no `window`).

import type { WeeklyPoint } from "@/components/charts/RevenueCostChart";

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function computeDashboardData({
  batches, purchases, sales, channels, crops, inventory, monthlyPnl,
}: {
  batches: any[];
  purchases: any[];
  sales: any[];
  channels: any[];
  crops: any[];
  inventory: any[];
  monthlyPnl: any[];
}) {
  const totalRevenue = sales.reduce((a: number, s: any) => a + (s.total_revenue ?? s.quantity * s.unit_price), 0);
  const totalCost = purchases.reduce((a: number, p: any) => a + (p.total ?? 0), 0);
  const activeBatches = batches.filter((b: any) => b.status === "growing" || b.status === "germinating").length;
  const traysInProduction = batches
    .filter((b: any) => b.status === "growing" || b.status === "germinating")
    .reduce((a: number, b: any) => a + (b.tray_amount ?? 0), 0);

  const lowStockCrops = inventory.filter(
    (i: any) => i.low_stock_threshold_trays != null && i.sowable_trays_remaining != null && i.sowable_trays_remaining <= i.low_stock_threshold_trays
  );

  const latestMonth = monthlyPnl[0];

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
  }, {} as Record<string, number>);

  return { totalRevenue, totalCost, activeBatches, traysInProduction, lowStockCrops, latestMonth, weeks, cropMarginData, channelCounts };
}
