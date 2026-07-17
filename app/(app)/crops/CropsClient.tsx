"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";
import { EmptyState } from "@/components/ui";
import CropForm from "@/components/forms/CropForm";

export default function CropsClient({
  orgId, crops, inventory, role,
}: { orgId: string; crops: any[]; inventory: any[]; role: string }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  const canEdit = role === "owner" || role === "admin";
  const canDelete = role === "owner";
  const inventoryByCrop = Object.fromEntries(inventory.map((i: any) => [i.crop_id, i]));

  async function deleteCrop(id: string, name: string) {
    if (DEMO_MODE) return;
    if (!window.confirm(`Delete "${name}" from the Crop Library? This can't be undone. Existing batches keep their own snapshot of this crop's data.`)) return;
    await supabase.from("crops").delete().eq("id", id);
    router.refresh();
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        {!showForm && <button className="btn-primary" onClick={() => { setShowForm(true); setEditingId(null); }}>+ Add crop</button>}
      </div>
      {showForm && <CropForm orgId={orgId} onDone={() => setShowForm(false)} />}

      {crops.length === 0 ? (
        <EmptyState title="No crops yet" hint="Add your first crop above, or crops are seeded automatically when your farm is created." />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {crops.map((c: any) => {
            const inv = inventoryByCrop[c.id];
            if (editingId === c.id) {
              return (
                <div key={c.id} className="md:col-span-2">
                  <CropForm orgId={orgId} crop={c} onDone={() => setEditingId(null)} />
                </div>
              );
            }
            return (
              <div key={c.id} className="card p-5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-stone-800">{c.name}</h3>
                  <div className="flex items-center gap-2 shrink-0">
                    {c.is_premium && <span className="badge bg-gold-400/20 text-gold-600">Premium</span>}
                    {canEdit && (
                      <button className="text-xs font-medium text-brand-700 hover:underline" onClick={() => setEditingId(c.id)}>Edit</button>
                    )}
                    {canDelete && (
                      <button className="text-xs font-medium text-red-600 hover:underline" onClick={() => deleteCrop(c.id, c.name)}>Delete</button>
                    )}
                  </div>
                </div>

                {inv && (
                  <div className="flex gap-3 mb-3 text-xs">
                    <span className="badge bg-blue-100 text-blue-700">Seed on hand: {Number(inv.seed_g_on_hand ?? 0).toFixed(1)}g</span>
                    <span className="badge bg-emerald-100 text-emerald-700">Harvested on hand: {Number(inv.harvest_oz_on_hand ?? 0).toFixed(1)}oz</span>
                  </div>
                )}

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
                  <Row label="Sow rate/tray" value={c.sow_rate_g ? `${c.sow_rate_g}g` : "—"} />
                </dl>
                {c.notes && <p className="text-xs text-stone-500 mt-3 pt-3 border-t border-stone-100">{c.notes}</p>}
              </div>
            );
          })}
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
