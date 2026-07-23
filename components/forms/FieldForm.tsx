"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";
import { errorMessage } from "@/lib/errors";

export default function FieldForm({ orgId, onDone }: { orgId: string; onDone: () => void }) {
  const supabase = createClient();
  const router = useRouter();
  const [name, setName] = useState("");
  const [isHighTunnel, setIsHighTunnel] = useState(false);
  const [rowLabels, setRowLabels] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (DEMO_MODE) { onDone(); return; }
      const { data: field, error: insertError } = await supabase
        .from("fields")
        .insert({ org_id: orgId, name, is_high_tunnel: isHighTunnel })
        .select()
        .single();
      if (insertError) throw insertError;

      const labels = rowLabels.split(",").map((l) => l.trim()).filter(Boolean);
      if (labels.length > 0) {
        const { error: rowsError } = await supabase
          .from("field_rows")
          .insert(labels.map((label) => ({ org_id: orgId, field_id: field.id, label })));
        if (rowsError) throw rowsError;
      }
      onDone();
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, "Could not save field"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-4 space-y-2">
      <div className="grid sm:grid-cols-2 gap-2">
        <div>
          <label className="label">Field name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="North 40" required />
        </div>
        <div>
          <label className="label">Rows/beds (optional, comma-separated)</label>
          <input className="input" value={rowLabels} onChange={(e) => setRowLabels(e.target.value)} placeholder="Row 1, Row 2, Row 3" />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-stone-600">
        <input type="checkbox" checked={isHighTunnel} onChange={(e) => setIsHighTunnel(e.target.checked)} />
        This is a high tunnel / greenhouse (tracked separately for microclimate)
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" className="btn-secondary" onClick={onDone}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Add field"}</button>
      </div>
    </form>
  );
}
