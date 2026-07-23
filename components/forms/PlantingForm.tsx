"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";
import { errorMessage } from "@/lib/errors";

type Crop = { id: string; name: string; crop_family: string | null };
type Row = { id: string; label: string };
type Conflict = { planting_id: string; crop_name_snapshot: string; planted_date: string };

export default function PlantingForm({
  orgId, fieldId, rows, crops, onDone,
}: { orgId: string; fieldId: string; rows: Row[]; crops: Crop[]; onDone: () => void }) {
  const supabase = createClient();
  const router = useRouter();
  const [cropId, setCropId] = useState(crops[0]?.id ?? "");
  const [rowId, setRowId] = useState("");
  const [plantedDate, setPlantedDate] = useState(new Date().toISOString().slice(0, 10));
  const [conflicts, setConflicts] = useState<Conflict[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCrop = crops.find((c) => c.id === cropId);

  async function checkAndMaybeSave(acknowledged: boolean) {
    setError(null);
    if (DEMO_MODE) { onDone(); return; }
    if (!selectedCrop) { setError("Pick a crop first."); return; }

    if (!acknowledged) {
      setChecking(true);
      const { data, error: rpcError } = await supabase.rpc("check_rotation_conflict", {
        p_field_id: fieldId,
        p_row_id: rowId || null,
        p_crop_family: selectedCrop.crop_family,
        p_lookback_years: 3,
      });
      setChecking(false);
      if (rpcError) { setError(rpcError.message); return; }
      if (data && data.length > 0) { setConflicts(data as Conflict[]); return; }
    }

    setSaving(true);
    try {
      const { error: insertError } = await supabase.from("plantings").insert({
        org_id: orgId,
        field_id: fieldId,
        row_id: rowId || null,
        crop_id: cropId,
        crop_name_snapshot: selectedCrop.name,
        crop_family_snapshot: selectedCrop.crop_family,
        planted_date: plantedDate,
        rotation_warning_acknowledged: acknowledged,
      });
      if (insertError) throw insertError;
      onDone();
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, "Could not save planting"));
    } finally {
      setSaving(false);
    }
  }

  if (conflicts) {
    return (
      <div className="mt-2 p-3 rounded-lg border border-red-300 bg-red-50 space-y-2">
        <p className="text-sm font-medium text-red-800">
          Rotation warning: {selectedCrop?.crop_family} was planted here as recently as{" "}
          {conflicts[0].planted_date} ({conflicts[0].crop_name_snapshot}).
        </p>
        <p className="text-xs text-red-700">
          Growing the same crop family in the same spot repeatedly can build up pests and disease and deplete
          the same nutrients. Consider rotating to a different family here — but this is your call.
        </p>
        <div className="flex gap-2 justify-end">
          <button type="button" className="btn-secondary !py-1 !px-2 text-xs" onClick={() => setConflicts(null)}>
            Go back
          </button>
          <button
            type="button"
            className="btn-primary !py-1 !px-2 text-xs bg-red-700 hover:bg-red-800"
            onClick={() => checkAndMaybeSave(true)}
            disabled={saving}
          >
            {saving ? "Saving…" : "Plant anyway"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); checkAndMaybeSave(false); }}
      className="mt-2 p-3 rounded-lg border border-emerald-200 bg-emerald-50/60 space-y-2"
    >
      <div className="text-xs font-medium text-stone-600">Add planting</div>
      <div className="grid sm:grid-cols-3 gap-2">
        <div>
          <label className="label !text-[11px]">Crop</label>
          <select className="input !py-1.5 text-sm" value={cropId} onChange={(e) => setCropId(e.target.value)} required>
            {crops.length === 0 && <option value="">No field crops in your Crop Library yet</option>}
            {crops.map((c) => <option key={c.id} value={c.id}>{c.name}{c.crop_family ? ` (${c.crop_family})` : ""}</option>)}
          </select>
        </div>
        {rows.length > 0 && (
          <div>
            <label className="label !text-[11px]">Row/bed</label>
            <select className="input !py-1.5 text-sm" value={rowId} onChange={(e) => setRowId(e.target.value)}>
              <option value="">Whole field</option>
              {rows.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="label !text-[11px]">Planted date</label>
          <input className="input !py-1.5 text-sm" type="date" value={plantedDate} onChange={(e) => setPlantedDate(e.target.value)} />
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" className="btn-secondary !py-1 !px-2 text-xs" onClick={onDone}>Cancel</button>
        <button type="submit" className="btn-primary !py-1 !px-2 text-xs" disabled={checking || saving || !cropId}>
          {checking ? "Checking rotation…" : saving ? "Saving…" : "Save planting"}
        </button>
      </div>
    </form>
  );
}
