"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";
import { StatusBadge, EmptyState } from "@/components/ui";
import BatchForm from "@/components/forms/BatchForm";
import HarvestForm from "@/components/forms/HarvestForm";

const STATUSES = ["germinating", "growing", "harvested", "sold_out", "composted"];
const ACTIVE_STATUSES = ["germinating", "growing"];

const TABS = [
  { key: "current", label: "Current Run" },
  { key: "harvested", label: "Harvested Crops" },
  { key: "all", label: "All Batches" },
] as const;

export default function BatchesClient({
  orgId, batches, crops, inventory,
}: { orgId: string; batches: any[]; crops: any[]; inventory: any[] }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("current");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [harvestingId, setHarvestingId] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  async function updateStatus(id: string, status: string) {
    if (DEMO_MODE) return;
    await supabase
      .from("batches")
      .update({ status, harvest_date: status === "harvested" ? new Date().toISOString().slice(0, 10) : undefined })
      .eq("id", id);
    router.refresh();
  }

  async function deleteBatch(id: string, batchLabel: string) {
    if (DEMO_MODE) return;
    if (!window.confirm(`Delete batch ${batchLabel}? This can't be undone — any seed/harvest inventory it accounted for will be reversed.`)) return;
    await supabase.from("batches").delete().eq("id", id);
    router.refresh();
  }

  const visibleBatches =
    tab === "current" ? batches.filter((b) => ACTIVE_STATUSES.includes(b.status)) :
    tab === "harvested" ? batches.filter((b) => b.status === "harvested") :
    batches;

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div className="flex rounded-lg bg-stone-100 p-1 text-sm font-medium">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`rounded-md px-3 py-1.5 transition-colors ${tab === t.key ? "bg-white shadow-sm text-brand-700" : "text-stone-500"}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        {!showForm && (
          <button className="btn-primary" onClick={() => { setShowForm(true); setEditingId(null); setHarvestingId(null); }}>
            + Add batch
          </button>
        )}
      </div>
      {showForm && <BatchForm orgId={orgId} crops={crops} inventory={inventory} onDone={() => setShowForm(false)} />}

      {visibleBatches.length === 0 ? (
        <EmptyState
          title={
            tab === "current" ? "Nothing germinating or growing right now" :
            tab === "harvested" ? "No harvests logged yet" : "No batches yet"
          }
          hint={
            tab === "current" ? "Add a batch to start a new run." :
            tab === "harvested" ? "Use \"Harvest\" on a batch in Current Run to log one — it'll show up here and update Inventory automatically." :
            "Log your first planting to start tracking cycles, costs, and yield."
          }
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-xs text-stone-500 uppercase tracking-wide">
              <tr>
                <th className="text-left py-3 px-4">Batch ID</th>
                <th className="text-left py-3 px-4">Crop</th>
                <th className="text-left py-3 px-4">Trays</th>
                <th className="text-left py-3 px-4">Planted</th>
                <th className="text-left py-3 px-4">Harvested</th>
                <th className="text-left py-3 px-4">Rack</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-right py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {visibleBatches.map((b) => (
                <Fragment key={b.id}>
                  <tr>
                    <td className="py-2.5 px-4 font-mono text-xs text-stone-500">{b.batch_id}</td>
                    <td className="py-2.5 px-4 font-medium text-stone-700">{b.crop_name_snapshot}</td>
                    <td className="py-2.5 px-4">{b.tray_amount}</td>
                    <td className="py-2.5 px-4 text-stone-500">{b.plant_date}</td>
                    <td className="py-2.5 px-4 text-stone-500">{b.harvest_date ?? "—"}</td>
                    <td className="py-2.5 px-4 text-stone-500">{b.rack_location ?? "—"}</td>
                    <td className="py-2.5 px-4">
                      <select
                        className="text-xs border-0 bg-transparent font-medium focus:outline-none focus:ring-1 focus:ring-brand-500 rounded cursor-pointer"
                        value={b.status}
                        onChange={(e) => updateStatus(b.id, e.target.value)}
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                      </select>
                      <span className="ml-2"><StatusBadge status={b.status} /></span>
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      {ACTIVE_STATUSES.includes(b.status) && (
                        <button
                          className="text-xs font-medium text-emerald-700 hover:underline mr-3"
                          onClick={() => { setHarvestingId(harvestingId === b.id ? null : b.id); setEditingId(null); setShowForm(false); }}
                        >
                          Harvest
                        </button>
                      )}
                      <button
                        className="text-xs font-medium text-brand-700 hover:underline mr-3"
                        onClick={() => { setEditingId(editingId === b.id ? null : b.id); setHarvestingId(null); setShowForm(false); }}
                      >
                        Edit
                      </button>
                      <button className="text-xs font-medium text-red-600 hover:underline" onClick={() => deleteBatch(b.id, b.batch_id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                  {harvestingId === b.id && (
                    <tr>
                      <td colSpan={8} className="px-4 pb-3">
                        <HarvestForm orgId={orgId} batch={b} onDone={() => setHarvestingId(null)} />
                      </td>
                    </tr>
                  )}
                  {editingId === b.id && (
                    <tr>
                      <td colSpan={8} className="px-4 pb-3">
                        <BatchForm orgId={orgId} crops={crops} inventory={inventory} batch={b} onDone={() => setEditingId(null)} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
