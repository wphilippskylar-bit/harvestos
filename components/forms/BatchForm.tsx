"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";

type Crop = { id: string; name: string };
type InventoryRow = { crop_id: string; seed_g_on_hand: number; sow_rate_g: number | null };
type Batch = {
  id: string;
  batch_id: string;
  crop_id: string | null;
  plant_date: string;
  tray_amount: number;
  rack_location: string | null;
  dry_seed_weight_g: number | null;
};

export default function BatchForm({
  orgId, crops, inventory, batch, onDone,
}: { orgId: string; crops: Crop[]; inventory: InventoryRow[]; batch?: Batch; onDone: () => void }) {
  const supabase = createClient();
  const router = useRouter();
  const isEdit = !!batch;
  const [batchId, setBatchId] = useState(batch?.batch_id ?? "");
  const [cropId, setCropId] = useState(batch?.crop_id ?? crops[0]?.id ?? "");
  const [plantDate, setPlantDate] = useState(batch?.plant_date ?? new Date().toISOString().slice(0, 10));
  const [trayAmount, setTrayAmount] = useState(batch?.tray_amount ?? 1);
  const [rackLocation, setRackLocation] = useState(batch?.rack_location ?? "");
  const [dryWeight, setDryWeight] = useState(batch?.dry_seed_weight_g?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inventoryByCrop = useMemo(() => Object.fromEntries(inventory.map((i) => [i.crop_id, i])), [inventory]);
  const selectedInv = inventoryByCrop[cropId];
  const noInventory = !selectedInv || selectedInv.seed_g_on_hand <= 0;
  const neededG = selectedInv?.sow_rate_g ? selectedInv.sow_rate_g * (trayAmount || 0) : null;
  const insufficientForTrays =
    !noInventory && neededG != null && selectedInv && neededG > selectedInv.seed_g_on_hand;

  async function generateId() {
    if (DEMO_MODE) {
      setBatchId(`ACF-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(Math.floor(Math.random() * 900) + 100)}`);
      return;
    }
    const { data, error } = await supabase.rpc("next_batch_id", { target_org: orgId });
    if (!error && data) setBatchId(data as string);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (DEMO_MODE) { onDone(); return; }
      const crop = crops.find((c) => c.id === cropId);

      if (isEdit && batch) {
        const { error } = await supabase.from("batches").update({
          batch_id: batchId,
          crop_id: cropId || null,
          crop_name_snapshot: crop?.name ?? null,
          plant_date: plantDate,
          tray_amount: trayAmount,
          rack_location: rackLocation || null,
          dry_seed_weight_g: dryWeight ? Number(dryWeight) : null,
        }).eq("id", batch.id);
        if (error) throw error;
      } else {
        let finalId = batchId;
        if (!finalId) {
          const { data } = await supabase.rpc("next_batch_id", { target_org: orgId });
          finalId = data as string;
        }
        const { error } = await supabase.from("batches").insert({
          org_id: orgId,
          batch_id: finalId,
          crop_id: cropId || null,
          crop_name_snapshot: crop?.name ?? null,
          plant_date: plantDate,
          tray_amount: trayAmount,
          rack_location: rackLocation || null,
          dry_seed_weight_g: dryWeight ? Number(dryWeight) : null,
          status: "germinating",
        });
        if (error) throw error;
      }
      onDone();
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Could not save batch";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 mb-4 space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Batch ID</label>
          <div className="flex gap-2">
            <input className="input font-mono" value={batchId} onChange={(e) => setBatchId(e.target.value)} placeholder="Auto-generated if left blank" />
            <button type="button" className="btn-secondary whitespace-nowrap" onClick={generateId}>Generate</button>
          </div>
          <p className="text-xs text-stone-400 mt-1">Auto-generated as PREFIX-YYYYMMDD-### — click Generate, or type your own.</p>
        </div>
        <div>
          <label className="label">Crop</label>
          <select className="input" value={cropId} onChange={(e) => setCropId(e.target.value)}>
            {crops.map((c) => {
              const inv = inventoryByCrop[c.id];
              const flagged = !inv || inv.seed_g_on_hand <= 0;
              return (
                <option key={c.id} value={c.id} style={flagged ? { color: "#dc2626" } : undefined}>
                  {c.name}{flagged ? " — no seed inventory" : ""}
                </option>
              );
            })}
          </select>
          {noInventory && (
            <p className="text-xs text-red-600 mt-1">No seed inventory logged for this crop yet — log a seed purchase first, or this batch will still save but won&apos;t track against real stock.</p>
          )}
          {insufficientForTrays && selectedInv && (
            <p className="text-xs text-red-600 mt-1">
              Only {selectedInv.seed_g_on_hand.toFixed(1)}g on hand — {trayAmount} tray{trayAmount === 1 ? "" : "s"} needs ~{neededG?.toFixed(1)}g.
            </p>
          )}
        </div>
        <div>
          <label className="label">Plant date</label>
          <input className="input" type="date" value={plantDate} onChange={(e) => setPlantDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Tray amount</label>
          <input className="input" type="number" min={1} value={trayAmount} onChange={(e) => setTrayAmount(Number(e.target.value))} />
        </div>
        <div>
          <label className="label">Rack location</label>
          <input className="input" value={rackLocation} onChange={(e) => setRackLocation(e.target.value)} placeholder="e.g. Rack 2, tier 3" />
        </div>
        <div>
          <label className="label">Dry seed weight (g)</label>
          <input className="input" type="number" step="0.1" value={dryWeight} onChange={(e) => setDryWeight(e.target.value)} />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" className="btn-secondary" onClick={onDone}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : isEdit ? "Save changes" : "Save batch"}</button>
      </div>
    </form>
  );
}
