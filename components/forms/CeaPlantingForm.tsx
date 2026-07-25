"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";
import { errorMessage } from "@/lib/errors";
import { defaultWeightUnit, WEIGHT_UNIT_OPTIONS } from "@/lib/units";

type Crop = { id: string; name: string };
type Row = { id: string; label: string };

const STATUSES = [
  { key: "planted", label: "Planted" },
  { key: "growing", label: "Growing" },
  { key: "harvested", label: "Harvested" },
  { key: "failed", label: "Failed" },
];

const GROWING_MEDIA = [
  { key: "", label: "— Not tracked —" },
  { key: "hydroponic_mat", label: "Hydroponic mat" },
  { key: "rockwool", label: "Rockwool" },
  { key: "nft_channel", label: "NFT channel" },
  { key: "coco_coir", label: "Coco coir" },
  { key: "soil", label: "Soil" },
  { key: "perlite_vermiculite", label: "Perlite / vermiculite" },
  { key: "other", label: "Other" },
];

export default function CeaPlantingForm({
  orgId, areaId, rows = [], crops = [], weightUnit, onDone,
}: {
  orgId: string;
  areaId: string;
  rows?: Row[];
  crops?: Crop[];
  weightUnit?: string;
  onDone: () => void;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [cropId, setCropId] = useState("");
  const [cropNameFreeform, setCropNameFreeform] = useState("");
  const [rowId, setRowId] = useState("");
  const [plantedDate, setPlantedDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedHarvestDate, setExpectedHarvestDate] = useState("");
  const [status, setStatus] = useState("planted");
  const [yieldAmount, setYieldAmount] = useState("");
  const [yieldUnit, setYieldUnit] = useState<string>(defaultWeightUnit(weightUnit));
  const [growingMedium, setGrowingMedium] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (DEMO_MODE) { onDone(); return; }
      const selectedCrop = crops.find((c) => c.id === cropId);
      const { error } = await supabase.from("cea_plantings").insert({
        org_id: orgId,
        area_id: areaId,
        row_id: rowId || null,
        crop_id: cropId || null,
        crop_name_snapshot: selectedCrop?.name ?? cropNameFreeform ?? null,
        planted_date: plantedDate,
        expected_harvest_date: expectedHarvestDate || null,
        status,
        yield_amount: yieldAmount ? Number(yieldAmount) : null,
        yield_unit: yieldAmount ? yieldUnit : null,
        growing_medium: growingMedium || null,
        notes: notes || null,
      });
      if (error) throw error;
      onDone();
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, "Could not save planting"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 mb-4 space-y-4">
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="label">Crop</label>
          {crops.length > 0 ? (
            <select className="input" value={cropId} onChange={(e) => setCropId(e.target.value)}>
              <option value="">— Select from Crop Library —</option>
              {crops.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          ) : (
            <input
              className="input"
              value={cropNameFreeform}
              onChange={(e) => setCropNameFreeform(e.target.value)}
              placeholder="e.g. Tomatoes"
            />
          )}
        </div>
        {rows.length > 0 && (
          <div>
            <label className="label">Row / bed (optional)</label>
            <select className="input" value={rowId} onChange={(e) => setRowId(e.target.value)}>
              <option value="">—</option>
              {rows.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="label">Status</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Planted date</label>
          <input className="input" type="date" value={plantedDate} onChange={(e) => setPlantedDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Expected harvest date</label>
          <input className="input" type="date" value={expectedHarvestDate} onChange={(e) => setExpectedHarvestDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Yield amount</label>
          <div className="flex gap-2">
            <input className="input" type="number" step="0.1" min="0" value={yieldAmount} onChange={(e) => setYieldAmount(e.target.value)} />
            <select className="input !w-24" value={yieldUnit} onChange={(e) => setYieldUnit(e.target.value)}>
              {WEIGHT_UNIT_OPTIONS.map((u) => <option key={u.key} value={u.key}>{u.key}</option>)}
              <option value="each">each</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Growing medium (optional)</label>
          <select className="input" value={growingMedium} onChange={(e) => setGrowingMedium(e.target.value)}>
            {GROWING_MEDIA.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </div>
        <div className="sm:col-span-3">
          <label className="label">Notes</label>
          <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" className="btn-secondary" onClick={onDone}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Save planting"}</button>
      </div>
    </form>
  );
}
