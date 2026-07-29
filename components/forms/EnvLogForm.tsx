"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";
import { errorMessage } from "@/lib/errors";
import { enqueueWrite, isNetworkError } from "@/lib/offlineQueue";

export default function EnvLogForm({ orgId, batchId, onDone }: { orgId: string; batchId?: string; onDone: () => void }) {
  const supabase = createClient();
  const router = useRouter();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [temp, setTemp] = useState("");
  const [humidity, setHumidity] = useState("");
  const [vpd, setVpd] = useState("");
  const [lightHours, setLightHours] = useState("18");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      org_id: orgId,
      batch_id: batchId || null,
      log_date: date,
      temperature_f: temp ? Number(temp) : null,
      humidity_pct: humidity ? Number(humidity) : null,
      vpd_kpa: vpd ? Number(vpd) : null,
      light_schedule_hours: lightHours ? Number(lightHours) : null,
      notes: notes || null,
    };
    try {
      if (DEMO_MODE) { onDone(); return; }
      const { error } = await supabase.from("environmental_logs").insert(payload);
      if (error) throw error;
      onDone();
      router.refresh();
    } catch (err) {
      // This form is what the QR "quick log" batch page (see app/(app)/batches/[id]/quick) opens
      // straight into — exactly the kind of spot-in-the-greenhouse-with-bad-signal moment this
      // queue exists for. Same pattern as Harvest/Grazing/Health log: save it locally, upload once
      // back online, rather than losing the reading.
      if (isNetworkError(err)) {
        enqueueWrite({ table: "environmental_logs", op: "insert", payload, label: `Environment reading — ${date}` });
        setQueued(true);
        setTimeout(onDone, 1200);
        return;
      }
      setError(errorMessage(err, "Could not save log"));
    } finally {
      setSaving(false);
    }
  }

  if (queued) {
    return (
      <div className="card p-4 mb-4 text-sm text-emerald-700 font-medium">
        Saved locally — will upload when you're back online.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 mb-4 space-y-4">
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="label">Date</label>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Temperature (°F)</label>
          <input className="input" type="number" step="0.1" value={temp} onChange={(e) => setTemp(e.target.value)} />
        </div>
        <div>
          <label className="label">Humidity (%)</label>
          <input className="input" type="number" step="0.1" value={humidity} onChange={(e) => setHumidity(e.target.value)} />
        </div>
        <div>
          <label className="label">VPD (kPa)</label>
          <input className="input" type="number" step="0.01" value={vpd} onChange={(e) => setVpd(e.target.value)} />
        </div>
        <div>
          <label className="label">Light schedule (hrs)</label>
          <input className="input" type="number" step="0.5" value={lightHours} onChange={(e) => setLightHours(e.target.value)} />
        </div>
        <div className="sm:col-span-3">
          <label className="label">Notes / observations</label>
          <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Pests, disease, anything unusual…" />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" className="btn-secondary" onClick={onDone}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Save log"}</button>
      </div>
    </form>
  );
}
