"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";

type Crop = { id: string; name: string };

export default function BatchForm({ orgId, crops, onDone }: { orgId: string; crops: Crop[]; onDone: () => void }) {
  const supabase = createClient();
  const router = useRouter();
  const [batchId, setBatchId] = useState("");
  const [cropId, setCropId] = useState(crops[0]?.id ?? "");
  const [plantDate, setPlantDate] = useState(new Date().toISOString().slice(0, 10));
  const [trayAmount, setTrayAmount] = useState(1);
  const [rackLocation, setRackLocation] = useState("");
  const [dryWeight, setDryWeight] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      let finalId = batchId;
      if (!finalId) {
        if (DEMO_MODE) {
          finalId = `ACF-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-001`;
        } else {
          const { data } = await supabase.rpc("next_batch_id", { target_org: orgId });
          finalId = data as string;
        }
      }
      if (DEMO_MODE) {
        onDone();
        return;
      }
      const crop = crops.find((c) => c.id === cropId);
      const { error } = await supabase.from("batches").insert({
        org_id: orgId,
        batch_id: finalId,
        crop_id: cropId || null,
        crop_name_snapshot: crop?.name ?? null,
        plant_date: plantDate,
        tray_amount: trayAmount,
        rack_location: rackLocation || null,
        dry_seed_weight_g: dryWeight ? Number(dryWeight) : null,
        status: "planted",
      });
      if (error) throw error;
      onDone();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save batch");
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
            {crops.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
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
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Save batch"}</button>
      </div>
    </form>
  );
}
