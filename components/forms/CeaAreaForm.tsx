"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";
import { errorMessage } from "@/lib/errors";

const AREA_TYPES = [
  { key: "greenhouse", label: "Greenhouse" },
  { key: "high_tunnel", label: "High tunnel (climate-controlled)" },
  { key: "indoor_vertical", label: "Indoor vertical farm" },
  { key: "hydroponic", label: "Hydroponic" },
  { key: "other", label: "Other" },
];

export default function CeaAreaForm({ orgId, onDone }: { orgId: string; onDone: () => void }) {
  const supabase = createClient();
  const router = useRouter();
  const [name, setName] = useState("");
  const [areaType, setAreaType] = useState("greenhouse");
  const [sqFt, setSqFt] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (DEMO_MODE) { onDone(); return; }
      const { error } = await supabase.from("cea_areas").insert({
        org_id: orgId,
        name,
        area_type: areaType,
        sq_ft: sqFt ? Number(sqFt) : null,
        notes: notes || null,
      });
      if (error) throw error;
      onDone();
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, "Could not save area"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 mb-4 space-y-4">
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="label">Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Greenhouse 1" required />
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input" value={areaType} onChange={(e) => setAreaType(e.target.value)}>
            {AREA_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Size (sq ft)</label>
          <input className="input" type="number" step="1" value={sqFt} onChange={(e) => setSqFt(e.target.value)} />
        </div>
        <div className="sm:col-span-3">
          <label className="label">Notes (optional)</label>
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" className="btn-secondary" onClick={onDone}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Save area"}</button>
      </div>
    </form>
  );
}
