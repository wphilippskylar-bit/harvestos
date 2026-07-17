"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";

const TYPES = ["restaurant", "farmers_market", "csa", "wholesale", "direct", "grocery", "other"];

export default function ChannelForm({ orgId, onDone }: { orgId: string; onDone: () => void }) {
  const supabase = createClient();
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState("restaurant");
  const [area, setArea] = useState("");
  const [pitch, setPitch] = useState("");
  const [contact, setContact] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (DEMO_MODE) { onDone(); return; }
      const { error } = await supabase.from("sales_channels").insert({
        org_id: orgId, name, channel_type: type, area: area || null, pitch_notes: pitch || null, contact_info: contact || null,
      });
      if (error) throw error;
      onDone();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save channel");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 mb-4 space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nonesuch" required />
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Area</label>
          <input className="input" value={area} onChange={(e) => setArea(e.target.value)} placeholder="Norman, OKC…" />
        </div>
        <div>
          <label className="label">Contact info</label>
          <input className="input" value={contact} onChange={(e) => setContact(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">What to sell them / pitch notes</label>
          <textarea className="input" rows={2} value={pitch} onChange={(e) => setPitch(e.target.value)} />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" className="btn-secondary" onClick={onDone}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Add channel"}</button>
      </div>
    </form>
  );
}
