"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";
import { errorMessage } from "@/lib/errors";

type AnimalOption = { id: string; ear_tag_number: string };
type Animal = {
  id: string;
  ear_tag_number: string;
  breed: string | null;
  birth_date: string | null;
  sire_id: string | null;
  dam_id: string | null;
  status: string;
  notes: string | null;
};

const STATUSES = ["active", "sold", "deceased"];

export default function AnimalForm({
  orgId, animals, animal, onDone,
}: { orgId: string; animals: AnimalOption[]; animal?: Animal; onDone: () => void }) {
  const supabase = createClient();
  const router = useRouter();
  const isEdit = !!animal;
  const [earTag, setEarTag] = useState(animal?.ear_tag_number ?? "");
  const [breed, setBreed] = useState(animal?.breed ?? "");
  const [birthDate, setBirthDate] = useState(animal?.birth_date ?? "");
  const [sireId, setSireId] = useState(animal?.sire_id ?? "");
  const [damId, setDamId] = useState(animal?.dam_id ?? "");
  const [status, setStatus] = useState(animal?.status ?? "active");
  const [notes, setNotes] = useState(animal?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Exclude the animal being edited from its own sire/dam options — an animal can't be its own parent.
  const parentOptions = animals.filter((a) => a.id !== animal?.id);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (DEMO_MODE) { onDone(); return; }
      const payload = {
        ear_tag_number: earTag.trim(),
        breed: breed.trim() || null,
        birth_date: birthDate || null,
        sire_id: sireId || null,
        dam_id: damId || null,
        notes: notes.trim() || null,
      };
      const { error: saveError } = isEdit
        ? await supabase.from("animals").update({ ...payload, status }).eq("id", animal!.id)
        : await supabase.from("animals").insert({ org_id: orgId, ...payload });
      if (saveError) throw saveError;
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
        {isEdit ? (
          <div>
            <label className="label">Status</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        ) : <div />}
        <div>
          <label className="label">Sire (optional)</label>
          <select className="input" value={sireId} onChange={(e) => setSireId(e.target.value)}>
            <option value="">—</option>
            {parentOptions.map((a) => <option key={a.id} value={a.id}>{a.ear_tag_number}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Dam (optional)</label>
          <select className="input" value={damId} onChange={(e) => setDamId(e.target.value)}>
            <option value="">—</option>
            {parentOptions.map((a) => <option key={a.id} value={a.id}>{a.ear_tag_number}</option>)}
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
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Save changes" : "Add animal"}
        </button>
      </div>
    </form>
  );
}
