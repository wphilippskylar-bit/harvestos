"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";
import { errorMessage } from "@/lib/errors";

type Field = { id: string; name: string };
type Animal = { id: string; ear_tag_number: string };
type Batch = { id: string; batch_id: string };

export default function LaborForm({
  orgId, fields = [], animals = [], batches = [], onDone,
}: { orgId: string; fields?: Field[]; animals?: Animal[]; batches?: Batch[]; onDone: () => void }) {
  const supabase = createClient();
  const router = useRouter();
  const [workDate, setWorkDate] = useState(new Date().toISOString().slice(0, 10));
  const [workerName, setWorkerName] = useState("");
  const [hours, setHours] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [fieldId, setFieldId] = useState("");
  const [animalId, setAnimalId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [taxDeductible, setTaxDeductible] = useState(true);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (DEMO_MODE) { onDone(); return; }
      const { error: insertError } = await supabase.from("labor_entries").insert({
        org_id: orgId,
        work_date: workDate,
        worker_name: workerName.trim() || null,
        hours: Number(hours) || 0,
        hourly_rate: Number(hourlyRate) || 0,
        field_id: fieldId || null,
        animal_id: animalId || null,
        batch_id: batchId || null,
        tax_deductible: taxDeductible,
        notes: notes.trim() || null,
      });
      if (insertError) throw insertError;
      onDone();
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, "Could not save labor entry"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 mb-4 space-y-4">
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="label">Date</label>
          <input className="input" type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Worker (optional)</label>
          <input className="input" value={workerName} onChange={(e) => setWorkerName(e.target.value)} />
        </div>
        <div />
        <div>
          <label className="label">Hours</label>
          <input className="input" type="number" step="0.25" value={hours} onChange={(e) => setHours(e.target.value)} required />
        </div>
        <div>
          <label className="label">Hourly rate ($)</label>
          <input className="input" type="number" step="0.01" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} required />
          <p className="text-xs text-stone-400 mt-1">For a flat fee, enter hours as 1 and the flat amount here.</p>
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-1.5 text-sm text-stone-600">
            <input type="checkbox" checked={taxDeductible} onChange={(e) => setTaxDeductible(e.target.checked)} />
            Tax-deductible
          </label>
        </div>
        {fields.length > 0 && (
          <div>
            <label className="label">Field (optional)</label>
            <select className="input" value={fieldId} onChange={(e) => setFieldId(e.target.value)}>
              <option value="">— not tied to a field —</option>
              {fields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
        )}
        {animals.length > 0 && (
          <div>
            <label className="label">Animal (optional)</label>
            <select className="input" value={animalId} onChange={(e) => setAnimalId(e.target.value)}>
              <option value="">— not tied to an animal —</option>
              {animals.map((a) => <option key={a.id} value={a.id}>{a.ear_tag_number}</option>)}
            </select>
          </div>
        )}
        {batches.length > 0 && (
          <div>
            <label className="label">Batch (optional)</label>
            <select className="input" value={batchId} onChange={(e) => setBatchId(e.target.value)}>
              <option value="">— not tied to a batch —</option>
              {batches.map((b) => <option key={b.id} value={b.id}>{b.batch_id}</option>)}
            </select>
          </div>
        )}
        <div className="sm:col-span-3">
          <label className="label">Notes (optional)</label>
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What was the work?" />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" className="btn-secondary" onClick={onDone}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Save labor entry"}</button>
      </div>
    </form>
  );
}
