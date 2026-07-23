import { getOrgContext, getProfitability } from "@/lib/data";
import { PageHeader, fmtCurrency2, EmptyState } from "@/components/ui";

function ProfitCell({ value }: { value: number }) {
  return (
    <td className={`py-2.5 px-4 text-right font-medium ${value >= 0 ? "text-emerald-700" : "text-red-600"}`}>
      {fmtCurrency2(value)}
    </td>
  );
}

export default async function ProfitabilityPage() {
  const ctx = await getOrgContext();
  const { cropMargin, fieldMargin, animalMargin, monthlyPnl } = await getProfitability(ctx.orgId);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Profitability"
        subtitle="Which crops, fields, and animals are actually making money — rolled up from your Purchases and Sales, not a separate spreadsheet."
      />

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-800">Monthly P&amp;L</h3>
          <p className="text-xs text-stone-400 mt-0.5">Revenue and costs across the whole operation, most recent months first.</p>
        </div>
        {monthlyPnl.length === 0 ? (
          <div className="px-5 py-4"><EmptyState title="No P&L data yet" hint="Log some purchases and sales to see this fill in." /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-xs text-stone-500 uppercase tracking-wide">
              <tr>
                <th className="text-left py-3 px-4">Month</th>
                <th className="text-right py-3 px-4">Revenue</th>
                <th className="text-right py-3 px-4">Costs</th>
                <th className="text-right py-3 px-4">Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {monthlyPnl.map((m: any) => (
                <tr key={m.month}>
                  <td className="py-2.5 px-4 text-stone-500">{new Date(m.month).toLocaleDateString(undefined, { year: "numeric", month: "long" })}</td>
                  <td className="py-2.5 px-4 text-right">{fmtCurrency2(m.net_revenue)}</td>
                  <td className="py-2.5 px-4 text-right">{fmtCurrency2(m.copex)}</td>
                  <ProfitCell value={m.profit} />
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-800">By crop</h3>
          <p className="text-xs text-stone-400 mt-0.5">Batches and their linked sales, per crop.</p>
        </div>
        {cropMargin.length === 0 ? (
          <div className="px-5 py-4"><EmptyState title="No crop data yet" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-xs text-stone-500 uppercase tracking-wide">
              <tr>
                <th className="text-left py-3 px-4">Crop</th>
                <th className="text-right py-3 px-4">Batches</th>
                <th className="text-right py-3 px-4">Trays</th>
                <th className="text-right py-3 px-4">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {cropMargin.map((c: any) => (
                <tr key={c.crop_name}>
                  <td className="py-2.5 px-4 font-medium text-stone-700">{c.crop_name ?? "Unlabeled"}</td>
                  <td className="py-2.5 px-4 text-right">{c.batch_count}</td>
                  <td className="py-2.5 px-4 text-right">{c.total_trays}</td>
                  <td className="py-2.5 px-4 text-right font-medium">{fmtCurrency2(c.total_revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-800">By field</h3>
          <p className="text-xs text-stone-400 mt-0.5">
            Only counts purchases/sales you've tagged to a field — tag them on the Purchases and Sales forms to fill this in.
          </p>
        </div>
        {fieldMargin.length === 0 ? (
          <div className="px-5 py-4"><EmptyState title="No fields yet" hint="Add a field, and tag purchases/sales to it, to see per-field profit here." /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-xs text-stone-500 uppercase tracking-wide">
              <tr>
                <th className="text-left py-3 px-4">Field</th>
                <th className="text-right py-3 px-4">Cost</th>
                <th className="text-right py-3 px-4">Revenue</th>
                <th className="text-right py-3 px-4">Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {fieldMargin.map((f: any) => (
                <tr key={f.field_id}>
                  <td className="py-2.5 px-4 font-medium text-stone-700">{f.field_name}</td>
                  <td className="py-2.5 px-4 text-right">{fmtCurrency2(f.total_cost)}</td>
                  <td className="py-2.5 px-4 text-right">{fmtCurrency2(f.total_revenue)}</td>
                  <ProfitCell value={f.profit} />
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-800">By animal</h3>
          <p className="text-xs text-stone-400 mt-0.5">
            Costs from health-log entries with a cost logged; revenue from sales tagged to that animal.
          </p>
        </div>
        {animalMargin.length === 0 ? (
          <div className="px-5 py-4"><EmptyState title="No animals yet" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-xs text-stone-500 uppercase tracking-wide">
              <tr>
                <th className="text-left py-3 px-4">Animal</th>
                <th className="text-right py-3 px-4">Cost</th>
                <th className="text-right py-3 px-4">Revenue</th>
                <th className="text-right py-3 px-4">Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {animalMargin.map((a: any) => (
                <tr key={a.animal_id}>
                  <td className="py-2.5 px-4 font-medium text-stone-700">{a.ear_tag_number}</td>
                  <td className="py-2.5 px-4 text-right">{fmtCurrency2(a.total_cost)}</td>
                  <td className="py-2.5 px-4 text-right">{fmtCurrency2(a.total_revenue)}</td>
                  <ProfitCell value={a.profit} />
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
