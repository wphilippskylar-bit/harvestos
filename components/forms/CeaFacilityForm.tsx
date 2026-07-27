"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";
import { errorMessage } from "@/lib/errors";

const FACILITY_TYPES = [
  { key: "building", label: "Building" },
  { key: "greenhouse_complex", label: "Greenhouse complex" },
  { key: "warehouse", label: "Warehouse" },
  { key: "other", label: "Other" },
];

// A facility groups multiple cea_areas ("rooms") under one roof — e.g. "Main Building" containing
// Room 1, Room 2, Veg Room, Flower Room. Purely optional: a grower with one room never needs this.
export default function CeaFacilityForm({ orgId, onDone }: { orgId: string; onDone: () => void }) {
  const supabase = createClient();
  const router = useRouter();
  const [name, setName] = useState("");
  const [facilityType, setFacilityType] = useState("building");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (DEMO_MODE) { onDone(); return; }
      const { error } = await supabase.from("cea_facilities").insert({
        org_id: orgId,
        name,
        facility_type: facilityType,
        notes: notes || null,
      });
      if (error) throw error;
      onDone();
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, "Could not save facility"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 mb-4 space-y-4">
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="label">Facility name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Main Building" required />
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input" value={facilityType} onChange={(e) => setFacilityType(e.target.value)}>
            {FACILITY_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Notes (optional)</label>
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" className="btn-secondary" onClick={onDone}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Save facility"}</button>
      </div>
    </form>
  );
}
