import { getOrgContext, getCrops } from "@/lib/data";
import { PageHeader, EmptyState } from "@/components/ui";

export default async function CropsPage() {
  const ctx = await getOrgContext();
  const crops = await getCrops(ctx.orgId);

  return (
    <div>
      <PageHeader title="Crop Library" subtitle="Your grow protocol, by crop — soak, blackout, watering, harvest & packaging. Seeded from your real records." />
      {crops.length === 0 ? (
        <EmptyState title="No crops yet" hint="Crops are seeded automatically when your farm is created." />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {crops.map((c: any) => (
            <div key={c.id} className="card p-5">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-stone-800">{c.name}</h3>
                {c.is_premium && <span className="badge bg-gold-400/20 text-gold-600 shrink-0">Premium</span>}
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                <Row label="Seed type" value={c.seed_type} />
                <Row label="Presoak" value={c.presoak} />
                <Row label="Sterilization" value={c.sterilization} />
                <Row label="Mat setup" value={c.mat_setup} />
                <Row label="Blackout" value={c.blackout_days} />
                <Row label="Light days" value={c.light_days} />
                <Row label="Total cycle" value={c.total_cycle_days_min && c.total_cycle_days_max ? `${c.total_cycle_days_min}-${c.total_cycle_days_max} days` : "—"} />
                <Row label="Harvest window" value={c.harvest_window} />
                <Row label="Cut height" value={c.cut_height} />
                <Row label="Watering" value={c.watering_schedule} />
                <Row label="Kelp schedule" value={c.kelp_schedule} />
                <Row label="Tent zone/temp" value={c.tent_zone_temp} />
                <Row label="Packaging" value={c.packaging} />
                <Row label="Storage temp" value={c.storage_temp} />
                <Row label="Seed cost/g" value={c.seed_cost_per_g ? `$${Number(c.seed_cost_per_g).toFixed(4)}` : "—"} />
              </dl>
              {c.notes && <p className="text-xs text-stone-500 mt-3 pt-3 border-t border-stone-100">{c.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <>
      <dt className="text-stone-400">{label}</dt>
      <dd className="text-stone-700 font-medium">{value || "—"}</dd>
    </>
  );
}
