"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";
import { errorMessage } from "@/lib/errors";

const TREATMENT_TYPES = [
  { key: "vaccine", label: "Vaccine" },
  { key: "medication", label: "Medication" },
  { key: "illness", label: "Illness" },
  { key: "injury", label: "Injury" },
  { key: "other", label: "Other" },
];

export default function HealthLogForm({
  orgId, animalId, onDone,
}: { orgId: string; animalId: string; onDone: () => void }) {
  const supabase = createClient();
  const router = useRouter();
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10));
  const [treatmentType, setTreatmentType] = useState("vaccine");
  const [treatmentName, setTreatmentName] = useState("");
  const [withdrawalDays, setWithdrawalDays] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (DEMO_MODE) { onDone(); return; }
      const { error: insertError } = await supabase.from("animal_health_logs").insert({
        org_id: orgId,
        animal_id: animalId,
        log_date: logDate,
        treatment_type: treatmentType,
        treatment_name: treatmentName.trim() || null,
        withdrawal_days: withdrawalDays ? Number(withdrawalDays) : null,
        notes: notes.trim() || null,
      });
      if (insertError) throw insertError;
      onDone();
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, "Could not save health log entry"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-4 space-y-2 mt-2">
      <div className="grid sm:grid-cols-2 gap-2">
        <div>
          <label className="label">Date</label>
          <input className="input" type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} required />
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input" value={treatmentType} onChange={(e) => setTreatmentType(e.target.value)}>
            {TREATMENT_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Treatment / product name</label>
          <input className="input" value={treatmentName} onChange={(e) => setTreatmentName(e.target.value)} placeholder="Ivermectin, Blackleg vaccine…" />
        </div>
        <div>
          <label className="label">Withdrawal period (days, optional)</label>
          <input className="input" type="number" min={0} value={withdrawalDays} onChange={(e) => setWithdrawalDays(e.target.value)} placeholder="e.g. 5" />
          <p className="text-xs text-stone-400 mt-1">How many days before it's safe to sell/milk this animal.</p>
        </div>
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" className="btn-secondary" onClick={onDone}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Add entry"}</button>
      </div>
    </form>
  );
}
