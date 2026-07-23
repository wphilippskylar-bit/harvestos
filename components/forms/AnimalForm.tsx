"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";
import { errorMessage } from "@/lib/errors";

type AnimalOption = { id: string; ear_tag_number: string };

export default function AnimalForm({
  orgId, animals, onDone,
}: { orgId: string; animals: AnimalOption[]; onDone: () => void }) {
  const supabase = createClient();
  const router = useRouter();
  const [earTag, setEarTag] = useState("");
  const [breed, setBreed] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [sireId, setSireId] = useState("");
  const [damId, setDamId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (DEMO_MODE) { onDone(); return; }
      const { error: insertError } = await supabase.from("animals").insert({
        org_id: orgId,
        ear_tag_number: earTag.trim(),
        breed: breed.trim() || null,
        birth_date: birthDate || null,
        sire_id: sireId || null,
        dam_id: damId || null,
        notes: notes.trim() || null,
      });
      if (insertError) throw insertError;
      onDone();
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, "Could not save animal"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-4 space-y-2">
      <div className="grid sm:grid-cols-2 gap-2">
        <div>
          <label className="label">Ear tag number</label>
          <input className="input" value={earTag} onChange={(e) => setEarTag(e.target.value)} placeholder="A-001" required />
        </div>
        <div>
          <label className="label">Breed</label>
          <input className="input" value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="Angus" />
        </div>
        <div>
          <label className="label">Birth date</label>
          <input className="input" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
        </div>
        <div />
        <div>
          <label className="label">Sire (optional)</label>
          <select className="input" value={sireId} onChange={(e) => setSireId(e.target.value)}>
            <option value="">—</option>
            {animals.map((a) => <option key={a.id} value={a.id}>{a.ear_tag_number}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Dam (optional)</label>
          <select className="input" value={damId} onChange={(e) => setDamId(e.target.value)}>
            <option value="">—</option>
            {animals.map((a) => <option key={a.id} value={a.id}>{a.ear_tag_number}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" className="btn-secondary" onClick={onDone}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Add animal"}</button>
      </div>
    </form>
  );
}
