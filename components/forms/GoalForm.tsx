"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";

const METRIC_TYPES = [
  { key: "revenue", label: "Revenue ($)" },
  { key: "trays_sold_week", label: "Trays sold / week" },
  { key: "take_home_month", label: "Take-home / month ($)" },
  { key: "accounts_active", label: "Active accounts" },
  { key: "custom", label: "Custom" },
];

export default function GoalForm({ orgId, onDone }: { orgId: string; onDone: () => void }) {
  const supabase = createClient();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [metricType, setMetricType] = useState("custom");
  const [targetValue, setTargetValue] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (DEMO_MODE) { onDone(); return; }
      const { error } = await supabase.from("goals").insert({
        org_id: orgId, title, metric_type: metricType, target_value: Number(targetValue) || 0,
        target_date: targetDate || null,
      });
      if (error) throw error;
      onDone();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save goal");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 mb-4 space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="label">Goal</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Land 5 recurring restaurant accounts" required />
        </div>
        <div>
          <label className="label">Metric type</label>
          <select className="input" value={metricType} onChange={(e) => setMetricType(e.target.value)}>
            {METRIC_TYPES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Target value</label>
          <input className="input" type="number" step="0.01" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} required />
        </div>
        <div>
          <label className="label">Target date (optional)</label>
          <input className="input" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" className="btn-secondary" onClick={onDone}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Set goal"}</button>
      </div>
    </form>
  );
}
