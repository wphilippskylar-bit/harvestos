"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";
import { errorMessage } from "@/lib/errors";

type Row = { id: string; label: string };
type Field = { id: string; name: string; field_rows: Row[] };
type RestConflict = { grazing_event_id: string; last_grazed_end: string; days_rested: number };

export default function GrazingForm({
  orgId, fields, onDone,
}: { orgId: string; fields: Field[]; onDone: () => void }) {
  const supabase = createClient();
  const router = useRouter();
  const [fieldId, setFieldId] = useState(fields[0]?.id ?? "");
  const [rowId, setRowId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [animalNotes, setAnimalNotes] = useState("");
  const [conflict, setConflict] = useState<RestConflict | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedField = fields.find((f) => f.id === fieldId);

  async function checkAndMaybeSave(acknowledged: boolean) {
    setError(null);
    if (DEMO_MODE) { onDone(); return; }
    if (!fieldId) { setError("Pick a field/pasture first."); return; }

    if (!acknowledged) {
      setChecking(true);
      const { data, error: rpcError } = await supabase.rpc("check_grazing_rest", {
        p_field_id: fieldId,
        p_row_id: rowId || null,
        p_start_date: startDate,
        p_rest_days: 25,
      });
      setChecking(false);
      if (rpcError) { setError(rpcError.message); return; }
      if (data && data.length > 0) { setConflict(data[0] as RestConflict); return; }
    }

    setSaving(true);
    try {
      const { error: insertError } = await supabase.from("grazing_events").insert({
        org_id: orgId,
        field_id: fieldId,
        row_id: rowId || null,
        start_date: startDate,
        end_date: endDate || null,
        animal_notes: animalNotes.trim() || null,
      });
      if (insertError) throw insertError;
      onDone();
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, "Could not save grazing entry"));
    } finally {
      setSaving(false);
    }
  }

  if (conflict) {
    return (
      <div className="mt-2 p-3 rounded-lg border border-red-300 bg-red-50 space-y-2">
        <p className="text-sm font-medium text-red-800">
          Rest warning: {selectedField?.name} was last grazed until {conflict.last_grazed_end} —
          only {conflict.days_rested} day{conflict.days_rested === 1 ? "" : "s"} of rest so far.
        </p>
        <p className="text-xs text-red-700">
          Rotational grazing generally wants 21–40+ days of rest depending on grass type and season,
          so regrazing this soon can slow pasture recovery. This is your call.
        </p>
        <div className="flex gap-2 justify-end">
          <button type="button" className="btn-secondary !py-1 !px-2 text-xs" onClick={() => setConflict(null)}>
            Go back
          </button>
          <button
            type="button"
            className="btn-primary !py-1 !px-2 text-xs bg-red-700 hover:bg-red-800"
            onClick={() => checkAndMaybeSave(true)}
            disabled={saving}
          >
            {saving ? "Saving…" : "Move herd anyway"}
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
      <div className="text-xs font-medium text-stone-600">Log grazing / move herd</div>
      <div className="grid sm:grid-cols-2 gap-2">
        <div>
          <label className="label !text-[11px]">Field / pasture</label>
          <select className="input !py-1.5 text-sm" value={fieldId} onChange={(e) => { setFieldId(e.target.value); setRowId(""); }} required>
            {fields.length === 0 && <option value="">No fields yet — add one under Fields first</option>}
            {fields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        {(selectedField?.field_rows?.length ?? 0) > 0 && (
          <div>
            <label className="label !text-[11px]">Row/section</label>
            <select className="input !py-1.5 text-sm" value={rowId} onChange={(e) => setRowId(e.target.value)}>
              <option value="">Whole field</option>
              {selectedField!.field_rows.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="label !text-[11px]">Start date</label>
          <input className="input !py-1.5 text-sm" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        </div>
        <div>
          <label className="label !text-[11px]">End date (optional — leave blank if still grazing)</label>
          <input className="input !py-1.5 text-sm" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label !text-[11px]">Which animals (optional)</label>
          <input className="input !py-1.5 text-sm" value={animalNotes} onChange={(e) => setAnimalNotes(e.target.value)} placeholder="e.g. 12 cattle, main herd" />
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" className="btn-secondary !py-1 !px-2 text-xs" onClick={onDone}>Cancel</button>
        <button type="submit" className="btn-primary !py-1 !px-2 text-xs" disabled={checking || saving || !fieldId}>
          {checking ? "Checking rest period…" : saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
