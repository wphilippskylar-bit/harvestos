import { isPlatformAdmin, getPlatformAggregateStats, getPlatformOrgRoster, getFeedback } from "@/lib/data";
import { PageHeader } from "@/components/ui";

const CATEGORY_LABELS: Record<string, string> = { bug: "Bug", idea: "Idea", general: "General" };
const CATEGORY_STYLES: Record<string, string> = {
  bug: "bg-red-100 text-red-700",
  idea: "bg-blue-100 text-blue-700",
  general: "bg-stone-100 text-stone-600",
};

export default async function AdminPage() {
  const admin = await isPlatformAdmin();
  if (!admin) {
    return (
      <div>
        <PageHeader title="Not available" subtitle="This page is restricted to Harvest OS platform admins." />
      </div>
    );
  }

  const [stats, roster, feedback] = await Promise.all([getPlatformAggregateStats(), getPlatformOrgRoster(), getFeedback()]);

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

      <div className="card overflow-hidden mt-8">
        <div className="px-5 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-800">Feedback</h3>
          <p className="text-xs text-stone-400 mt-0.5">
            Everything submitted through the "Feedback" button in the app, newest first. Only
            visible to platform admins.
          </p>
        </div>
        <div className="divide-y divide-stone-100">
          {feedback.length === 0 ? (
            <p className="px-5 py-4 text-xs text-stone-400">No feedback submitted yet.</p>
          ) : (
            feedback.map((f: any) => (
              <div key={f.id} className="px-5 py-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`badge ${CATEGORY_STYLES[f.category] ?? "bg-stone-100 text-stone-600"}`}>
                    {CATEGORY_LABELS[f.category] ?? f.category}
                  </span>
                  <span className="text-xs text-stone-500">{f.organizations?.name ?? "Unknown farm"}</span>
                  {f.user_email && <span className="text-xs text-stone-400">· {f.user_email}</span>}
                  <span className="text-xs text-stone-400">· {f.page_path ?? "unknown page"}</span>
                  <span className="text-xs text-stone-400 ml-auto whitespace-nowrap">
                    {new Date(f.created_at).toLocaleDateString()} {new Date(f.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-sm text-stone-700 mt-1.5">{f.message}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
