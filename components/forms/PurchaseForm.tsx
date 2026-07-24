"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";
import { errorMessage } from "@/lib/errors";

const CATEGORIES = ["Seeds", "Trays", "Medium", "Equipment", "Supplies", "Packaging", "Rent", "Utilities", "Insurance", "Marketing", "Other"];

type Crop = { id: string; name: string };
type Field = { id: string; name: string };
type Supply = { supply_id: string; name: string; category: string; unit: string };

const CATEGORY_LABELS: Record<string, string> = { nutrient: "Nutrient", feed: "Feed", commercial_seed: "Commercial seed" };

export default function PurchaseForm({
  orgId, crops, fields = [], supplies = [], onDone,
}: { orgId: string; crops: Crop[]; fields?: Field[]; supplies?: Supply[]; onDone: () => void }) {
  const supabase = createClient();
  const router = useRouter();
  const [mode, setMode] = useState<"general" | "seed" | "supply">("general");
  const [item, setItem] = useState("");
  const [category, setCategory] = useState("Seeds");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amountQty, setAmountQty] = useState("");
  const [vendor, setVendor] = useState("");
  const [cost, setCost] = useState("");
  const [tax, setTax] = useState("");
  const [shipping, setShipping] = useState("");
  const [cropId, setCropId] = useState(crops[0]?.id ?? "");
  const [seedWeightG, setSeedWeightG] = useState("");
  const [fieldId, setFieldId] = useState("");
  const [supplyId, setSupplyId] = useState(supplies[0]?.supply_id ?? "");
  const [supplyQty, setSupplyQty] = useState("");
  const [taxDeductible, setTaxDeductible] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function switchMode(next: "general" | "seed" | "supply") {
    setMode(next);
    if (next === "seed") {
      const crop = crops.find((c) => c.id === cropId) ?? crops[0];
      setCategory("Seeds");
      if (crop && !item) setItem(`${crop.name} seed`);
    }
    if (next === "supply") {
      const supply = supplies.find((s) => s.supply_id === supplyId) ?? supplies[0];
      setCategory("Supplies");
      if (supply && !item) setItem(supply.name);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (DEMO_MODE) { onDone(); return; }
      const { error } = await supabase.from("purchases").insert({
        org_id: orgId,
        purchase_date: date,
        item,
        category,
        amount_qty: amountQty || null,
        vendor: vendor || null,
        cost: Number(cost) || 0,
        tax: Number(tax) || 0,
        shipping: Number(shipping) || 0,
        crop_id: mode === "seed" ? cropId || null : null,
        seed_weight_g: mode === "seed" && seedWeightG ? Number(seedWeightG) : null,
        field_id: fieldId || null,
        supply_id: mode === "supply" ? supplyId || null : null,
        supply_qty: mode === "supply" && supplyQty ? Number(supplyQty) : null,
        tax_deductible: taxDeductible,
      });
      if (error) throw error;
      onDone();
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, "Could not save purchase"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 mb-4 space-y-4">
      <div className="flex rounded-lg bg-stone-100 p-1 text-sm font-medium max-w-xs">
        <button
          type="button"
          className={`flex-1 rounded-md py-1.5 transition-colors ${mode === "general" ? "bg-white shadow-sm text-brand-700" : "text-stone-500"}`}
          onClick={() => switchMode("general")}
        >
          General purchase
        </button>
        <button
          type="button"
          className={`flex-1 rounded-md py-1.5 transition-colors ${mode === "seed" ? "bg-white shadow-sm text-brand-700" : "text-stone-500"}`}
          onClick={() => switchMode("seed")}
        >
          Seed purchase
        </button>
        {supplies.length > 0 && (
          <button
            type="button"
            className={`flex-1 rounded-md py-1.5 transition-colors ${mode === "supply" ? "bg-white shadow-sm text-brand-700" : "text-stone-500"}`}
            onClick={() => switchMode("supply")}
          >
            Supply purchase
          </button>
        )}
      </div>

      {mode === "seed" && (
        <p className="text-xs text-stone-400 -mt-2">
          Adds straight to that crop&apos;s seed inventory (grams on hand) as soon as you save.
        </p>
      )}
      {mode === "supply" && (
        <p className="text-xs text-stone-400 -mt-2">
          Adds straight to that item&apos;s stock on hand as soon as you save.
        </p>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        {mode === "seed" && (
          <>
            <div>
              <label className="label">Crop</label>
              <select
                className="input"
                value={cropId}
                onChange={(e) => {
                  setCropId(e.target.value);
                  const crop = crops.find((c) => c.id === e.target.value);
                  if (crop) setItem(`${crop.name} seed`);
                }}
              >
                {crops.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Dry seed weight (g)</label>
              <input className="input" type="number" step="0.1" value={seedWeightG} onChange={(e) => setSeedWeightG(e.target.value)} required />
            </div>
          </>
        )}

        {mode === "supply" && (
          <div>
            <label className="label">Supply item</label>
            <select
              className="input"
              value={supplyId}
              onChange={(e) => {
                setSupplyId(e.target.value);
                const supply = supplies.find((s) => s.supply_id === e.target.value);
                if (supply) setItem(supply.name);
              }}
            >
              {supplies.map((s) => (
                <option key={s.supply_id} value={s.supply_id}>
                  {s.name} ({CATEGORY_LABELS[s.category] ?? s.category})
                </option>
              ))}
            </select>
          </div>
        )}
        {mode === "supply" && (
          <div>
            <label className="label">Qty purchased ({supplies.find((s) => s.supply_id === supplyId)?.unit ?? "unit"})</label>
            <input className="input" type="number" step="0.01" value={supplyQty} onChange={(e) => setSupplyQty(e.target.value)} required />
          </div>
        )}

        <div className={mode === "seed" ? "" : "sm:col-span-2"}>
          <label className="label">Item</label>
          <input className="input" value={item} onChange={(e) => setItem(e.target.value)} required />
        </div>
        <div>
          <label className="label">Category</label>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)} disabled={mode === "seed" || mode === "supply"}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Date</label>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Amount / qty</label>
          <input className="input" value={amountQty} onChange={(e) => setAmountQty(e.target.value)} placeholder="5lbs, 1 unit…" />
        </div>
        <div>
          <label className="label">Vendor</label>
          <input className="input" value={vendor} onChange={(e) => setVendor(e.target.value)} />
        </div>
        <div>
          <label className="label">Cost ($)</label>
          <input className="input" type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} required />
        </div>
        <div>
          <label className="label">Tax ($)</label>
          <input className="input" type="number" step="0.01" value={tax} onChange={(e) => setTax(e.target.value)} />
        </div>
        <div>
          <label className="label">Shipping ($)</label>
          <input className="input" type="number" step="0.01" value={shipping} onChange={(e) => setShipping(e.target.value)} />
        </div>
        {fields.length > 0 && (
          <div>
            <label className="label">Field (optional)</label>
            <select className="input" value={fieldId} onChange={(e) => setFieldId(e.target.value)}>
              <option value="">— not tied to a field —</option>
              {fields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <p className="text-xs text-stone-400 mt-1">Attributes this cost to that field's profitability.</p>
          </div>
        )}
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-1.5 text-sm text-stone-600">
            <input type="checkbox" checked={taxDeductible} onChange={(e) => setTaxDeductible(e.target.checked)} />
            Tax-deductible
          </label>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" className="btn-secondary" onClick={onDone}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Save purchase"}</button>
      </div>
    </form>
  );
}
