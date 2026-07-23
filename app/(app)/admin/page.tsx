import { isPlatformAdmin, getPlatformAggregateStats, getPlatformOrgRoster } from "@/lib/data";
import { PageHeader } from "@/components/ui";

export default async function AdminPage() {
  const admin = await isPlatformAdmin();
  if (!admin) {
    return (
      <div>
        <PageHeader title="Not available" subtitle="This page is restricted to Harvest OS platform admins." />
      </div>
    );
  }

  const [stats, roster] = await Promise.all([getPlatformAggregateStats(), getPlatformOrgRoster()]);

  const tiles = stats
    ? [
        { label: "Farms on the platform", value: stats.total_orgs },
        { label: "Using microgreens tracking", value: stats.orgs_with_microgreens },
        { label: "Using field-crop tracking", value: stats.orgs_with_field_crop },
        { label: "Using livestock tracking", value: stats.orgs_with_livestock },
        { label: "Fields tracked", value: stats.total_fields },
        { label: "Acres tracked", value: Number(stats.total_field_acres).toLocaleString() },
        { label: "Active plantings", value: stats.total_active_plantings },
        { label: "Animals tracked (active)", value: stats.total_animals },
        { label: "Active microgreens batches", value: stats.total_active_batches },
        { label: "Grazing events logged", value: stats.total_grazing_events },
      ]
    : [];

  return (
    <div>
      <PageHeader
        title="Platform overview"
        subtitle="Aggregate, anonymized counts across every farm on Harvest OS — no individual farm's financial data is shown here. This is the impact-metrics view for institutional partners (OSU Extension, Chickasaw Nation Ag, USDA)."
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {tiles.map((t) => (
          <div key={t.label} className="card p-4">
            <div className="text-2xl font-bold text-stone-800">{t.value}</div>
            <div className="text-xs text-stone-400 mt-1">{t.label}</div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-800">Farms on the platform</h3>
          <p className="text-xs text-stone-400 mt-0.5">Name and which modules they use — no financial data.</p>
        </div>
        <div className="divide-y divide-stone-100">
          {roster.length === 0 ? (
            <p className="px-5 py-4 text-xs text-stone-400">No farms yet.</p>
          ) : (
            roster.map((o: any) => (
              <div key={o.org_id} className="px-5 py-3 flex items-center justify-between text-sm">
                <span className="font-medium text-stone-700">{o.org_name}</span>
                <span className="text-xs text-stone-400">
                  {(o.operation_types ?? []).join(", ")} · joined {new Date(o.created_at).toLocaleDateString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
