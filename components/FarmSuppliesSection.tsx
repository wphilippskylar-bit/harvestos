"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";
import { errorMessage } from "@/lib/errors";
import { EmptyState } from "@/components/ui";

type SupplyRow = {
  supply_id: string;
  name: string;
  category: string;
  unit: string;
  low_stock_threshold: number | null;
  qty_on_hand: number;
};

const CATEGORY_LABELS: Record<string, string> = {
  nutrient: "Nutrient",
  feed: "Feed",
  commercial_seed: "Commercial seed",
  equipment: "Equipment",
};

export default function FarmSuppliesSection({
  orgId, supplies, categories, title, hint, isEditor,
}: {
  orgId: string;
  supplies: SupplyRow[];
  categories: string[];
  title: string;
  hint: string;
  isEditor: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [showNewForm, setShowNewForm] = useState(false);
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState(categories[0] ?? "nutrient");
  const [newUnit, setNewUnit] = useState("lb");
  const [newThreshold, setNewThreshold] = useState("");
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustReason, setAdjustReason] = useState("usage");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addSupply(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (DEMO_MODE) { setShowNewForm(false); return; }
      const { error: insertError } = await supabase.from("farm_supplies").insert({
        org_id: orgId,
        name: newName.trim(),
        category: newCategory,
        unit: newUnit.trim() || "unit",
        low_stock_threshold: newThreshold ? Number(newThreshold) : null,
      });
      if (insertError) throw insertError;
      setNewName(""); setNewThreshold(""); setShowNewForm(false);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, "Could not add item"));
    } finally {
      setSaving(false);
    }
  }

  async function logMovement(supplyId: string) {
    setSaving(true);
    setError(null);
    try {
      if (DEMO_MODE) { setAdjustingId(null); return; }
      const qty = Number(adjustQty);
      if (!qty) { setError("Enter a quantity."); setSaving(false); return; }
      const delta = adjustReason === "usage" ? -Math.abs(qty) : qty;
      const { error: insertError } = await supabase.from("supply_movements").insert({
        org_id: orgId,
        supply_id: supplyId,
        delta,
        reason: adjustReason,
      });
      if (insertError) throw insertError;
      setAdjustQty(""); setAdjustingId(null);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, "Could not log movement"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-stone-800">{title}</h3>
          <p className="text-xs text-stone-400 mt-0.5">{hint}</p>
        </div>
        {isEditor && !showNewForm && (
          <button className="btn-primary !py-1.5 !px-3 text-xs" onClick={() => setShowNewForm(true)}>+ Add item</button>
        )}
      </div>

      {showNewForm && (
        <form onSubmit={addSupply} className="px-5 py-4 border-b border-stone-100 space-y-2 bg-stone-50">
          <div className="grid sm:grid-cols-4 gap-2">
            <div className="sm:col-span-2">
              <label className="label !text-[11px]">Name</label>
              <input className="input !py-1.5 text-sm" value={newName} onChange={(e) => setNewName(e.target.value)} required />
            </div>
            {categories.length > 1 && (
              <div>
                <label className="label !text-[11px]">Category</label>
                <select className="input !py-1.5 text-sm" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
                  {categories.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="label !text-[11px]">Unit</label>
              <input className="input !py-1.5 text-sm" value={newUnit} onChange={(e) => setNewUnit(e.target.value)} placeholder="lb, gal, bag…" />
            </div>
            <div>
              <label className="label !text-[11px]">Low-stock alert below</label>
              <input className="input !py-1.5 text-sm" type="number" value={newThreshold} onChange={(e) => setNewThreshold(e.target.value)} />
            </div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" className="btn-secondary !py-1 !px-2 text-xs" onClick={() => setShowNewForm(false)}>Cancel</button>
            <button type="submit" className="btn-primary !py-1 !px-2 text-xs" disabled={saving}>{saving ? "Saving…" : "Add"}</button>
          </div>
        </form>
      )}

      {supplies.length === 0 ? (
        <div className="px-5 py-4"><EmptyState title="Nothing here yet" hint="Add an item, or it'll fill in automatically once you log a purchase tied to it." /></div>
      ) : (
        <div className="divide-y divide-stone-100">
          {supplies.map((s) => {
            const low = s.low_stock_threshold != null && s.qty_on_hand < s.low_stock_threshold;
            return (
              <div key={s.supply_id} className="px-5 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-stone-700">{s.name}</span>
                    {categories.length > 1 && <span className="text-xs text-stone-400 ml-2">{CATEGORY_LABELS[s.category]}</span>}
                    {low && <span className="badge bg-red-100 text-red-700 ml-2">Low stock</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-stone-600">{s.qty_on_hand} {s.unit}</span>
                    {isEditor && (
                      <button
                        className="text-xs font-medium text-brand-700 hover:underline"
                        onClick={() => { setAdjustingId(adjustingId === s.supply_id ? null : s.supply_id); setError(null); }}
                      >
                        Log usage
                      </button>
                    )}
                  </div>
                </div>
                {adjustingId === s.supply_id && (
                  <div className="mt-2 flex items-center gap-2">
                    <select className="input !py-1 !px-2 text-xs w-auto" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)}>
                      <option value="usage">Used</option>
                      <option value="adjustment">Correction (add/remove)</option>
                    </select>
                    <input
                      className="input !py-1 !px-2 text-xs w-24"
                      type="number"
                      value={adjustQty}
                      onChange={(e) => setAdjustQty(e.target.value)}
                      placeholder="qty"
                    />
                    <button className="btn-primary !py-1 !px-2 text-xs" onClick={() => logMovement(s.supply_id)} disabled={saving}>
                      {saving ? "Saving…" : "Save"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {error && !showNewForm && !adjustingId && <p className="text-xs text-red-600 px-5 pb-3">{error}</p>}
    </div>
  );
}
