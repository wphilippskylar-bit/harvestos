"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";

export default function InventoryAdjustForm({
  orgId, cropId, cropName, onDone,
}: { orgId: string; cropId: string; cropName: string; onDone: () => void }) {
  const supabase = createClient();
  const router = useRouter();
  const [kind, setKind] = useState<"seed_g" | "harvest_oz">("seed_g");
  const [delta, setDelta] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (DEMO_MODE) { onDone(); return; }
      const value = Number(delta);
      if (!value) { setError("Enter a non-zero amount (positive to add, negative to remove)"); setSaving(false); return; }
      const { error } = await supabase.from("inventory_movements").insert({
        org_id: orgId,
        crop_id: cropId,
        kind,
        delta: value,
        reason: "adjustment",
        notes: notes || null,
      });
      if (error) throw error;
      onDone();
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Could not save adjustment";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 p-3 rounded-lg border border-stone-200 bg-stone-50 space-y-2">
      <div className="text-xs font-medium text-stone-600">Adjust {cropName}</div>
      <div className="grid grid-cols-2 gap-2">
        <select className="input !py-1.5 text-sm" value={kind} onChange={(e) => setKind(e.target.value as "seed_g" | "harvest_oz")}>
          <option value="seed_g">Seed on hand (g)</option>
          <option value="harvest_oz">Harvested on hand (oz)</option>
        </select>
        <input
          className="input !py-1.5 text-sm"
          type="number"
          step="0.01"
          value={delta}
          onChange={(e) => setDelta(e.target.value)}
          placeholder="+10 or -5"
          required
        />
      </div>
      <input className="input !py-1.5 text-sm" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Why (e.g. recount, spoilage)" />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" className="btn-secondary !py-1 !px-2 text-xs" onClick={onDone}>Cancel</button>
        <button type="submit" className="btn-primary !py-1 !px-2 text-xs" disabled={saving}>{saving ? "Saving…" : "Save adjustment"}</button>
      </div>
    </form>
  );
}
