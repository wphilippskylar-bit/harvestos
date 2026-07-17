"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";

const UNITS = ["tray", "oz", "clamshell", "lb", "live_tray"];

export default function SaleForm({
  orgId, channels, onDone,
}: { orgId: string; channels: { id: string; name: string }[]; onDone: () => void }) {
  const supabase = createClient();
  const router = useRouter();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [channelId, setChannelId] = useState(channels[0]?.id ?? "");
  const [unit, setUnit] = useState("clamshell");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [customer, setCustomer] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (DEMO_MODE) { onDone(); return; }
      const { error } = await supabase.from("sales").insert({
        org_id: orgId,
        sale_date: date,
        channel_id: channelId || null,
        unit,
        quantity: Number(quantity) || 0,
        unit_price: Number(unitPrice) || 0,
        customer_name: customer || null,
      });
      if (error) throw error;
      onDone();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save sale");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 mb-4 space-y-4">
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="label">Date</label>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Channel / customer</label>
          <select className="input" value={channelId} onChange={(e) => setChannelId(e.target.value)}>
            <option value="">— none / one-off —</option>
            {channels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Unit</label>
          <select className="input" value={unit} onChange={(e) => setUnit(e.target.value)}>
            {UNITS.map((u) => <option key={u} value={u}>{u.replace("_", " ")}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Quantity</label>
          <input className="input" type="number" step="0.1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
        </div>
        <div>
          <label className="label">Price per unit ($)</label>
          <input className="input" type="number" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} required />
        </div>
        <div className="sm:col-span-3">
          <label className="label">Customer name (optional)</label>
          <input className="input" value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="e.g. neighbor, market walk-up" />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" className="btn-secondary" onClick={onDone}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Save sale"}</button>
      </div>
    </form>
  );
}
