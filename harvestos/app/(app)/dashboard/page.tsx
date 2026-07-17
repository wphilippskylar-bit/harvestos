import { getOrgContext, getBatches, getPurchases, getSales, getSalesChannels, getCrops, getGoals } from "@/lib/data";
import { PageHeader, fmtCurrency, fmtCurrency2 } from "@/components/ui";
import RevenueCostChart, { type WeeklyPoint } from "@/components/charts/RevenueCostChart";
import CropMarginChart from "@/components/charts/CropMarginChart";
import ChannelStatusChart from "@/components/charts/ChannelStatusChart";
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
  const [batches, purchases, sales, channels, crops, goals] = await Promise.all([
    getBatches(ctx.orgId),
    getPurchases(ctx.orgId),
    getSales(ctx.orgId),
    getSalesChannels(ctx.orgId),
    getCrops(ctx.orgId),
    getGoals(ctx.orgId),
  ]);

  const totalRevenue = sales.reduce((a: number, s: any) => a + (s.total_revenue ?? s.quantity * s.unit_price), 0);
  const totalCost = purchases.reduce((a: number, p: any) => a + (p.total ?? 0), 0);
  const activeBatches = batches.filter((b: any) => b.status === "growing" || b.status === "planted").length;
  const traysInProduction = batches
    .filter((b: any) => b.status === "growing" || b.status === "planted")
    .reduce((a: number, b: any) => a + (b.tray_amount ?? 0), 0);

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
        subtitle="Your farm at a glance — updates live as you log batches, purchases, and sales."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <StatTile label="Total revenue" value={fmtCurrency(totalRevenue)} />
        <StatTile label="Total costs" value={fmtCurrency(totalCost)} />
        <StatTile label="Trays in production" value={String(traysInProduction)} note={`${activeBatches} active batch${activeBatches === 1 ? "" : "es"}`} />
        <StatTile label="Sales channels" value={String(channels.length)} note={`${channelCounts.active ?? 0} active`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <div className="card p-5">
          <h2 className="font-semibold text-stone-800 mb-1">Revenue vs. cost — last 8 weeks</h2>
          <p className="text-xs text-stone-400 mb-3">From your Sales and Purchases logs.</p>
          <RevenueCostChart data={weeks} />
        </div>
        <div className="card p-5">
          <h2 className="font-semibold text-stone-800 mb-1">Sales channel pipeline</h2>
          <p className="text-xs text-stone-400 mb-3">Untried → Attempted → In Progress → Active.</p>
          <ChannelStatusChart counts={channelCounts} />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <div className="card p-5">
          <h2 className="font-semibold text-stone-800 mb-1">Cost per tray by crop</h2>
          <p className="text-xs text-stone-400 mb-3">Gold = premium/specialty crop. Lower is better margin.</p>
          <CropMarginChart data={cropMarginData} />
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-stone-800">Goals</h2>
            <Link href="/goals" className="text-xs font-medium text-brand-700 hover:underline">View all →</Link>
          </div>
          <div className="space-y-4">
            {goals.length === 0 && <p className="text-sm text-stone-400">No goals set yet.</p>}
            {goals.slice(0, 3).map((g: any) => {
              const pct = Math.min(100, g.target_value ? (g.current_value / g.target_value) * 100 : 0);
              return (
                <div key={g.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-stone-700">{g.title}</span>
                    <span className="text-stone-400">{Math.round(pct)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                    <div className="h-full bg-brand-600 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card p-5">
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
              {batches.slice(0, 6).map((b: any) => (
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
      </div>
    </div>
  );
}

function StatTile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-medium text-stone-500">{label}</div>
      <div className="text-xl md:text-2xl font-extrabold text-stone-900 mt-1">{value}</div>
      {note && <div className="text-xs text-stone-400 mt-0.5">{note}</div>}
    </div>
  );
}
