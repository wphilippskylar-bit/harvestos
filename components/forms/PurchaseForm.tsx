"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";
import { errorMessage } from "@/lib/errors";

const CATEGORIES = ["Seeds", "Trays", "Medium", "Equipment", "Supplies", "Packaging", "Rent", "Utilities", "Insurance", "Marketing", "Livestock", "Other"];
const NEW_SUPPLY = "__new__";

type Crop = { id: string; name: string };
type Field = { id: string; name: string };
type Supply = { supply_id: string; name: string; category: string; unit: string };
type Animal = { id: string; ear_tag_number: string };

const CATEGORY_LABELS: Record<string, string> = { nutrient: "Nutrient", feed: "Feed", commercial_seed: "Commercial seed", equipment: "Equipment" };

export default function PurchaseForm({
  orgId, crops, fields = [], supplies = [], animals = [], onDone,
}: { orgId: string; crops: Crop[]; fields?: Field[]; supplies?: Supply[]; animals?: Animal[]; onDone: () => void }) {
  const supabase = createClient();
  const router = useRouter();
  const [mode, setMode] = useState<"general" | "seed" | "supply" | "equipment" | "livestock">("general");
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
  const [taxDeductible, setTaxDeductible] = useState(true);

  // Supply purchase mode
  const [supplyId, setSupplyId] = useState(supplies[0]?.supply_id ?? (supplies.length === 0 ? NEW_SUPPLY : ""));
  const [supplyQty, setSupplyQty] = useState("");
  const [newSupplyName, setNewSupplyName] = useState("");
  const [newSupplyCategory, setNewSupplyCategory] = useState<"nutrient" | "feed" | "commercial_seed" | "equipment">("nutrient");
  const [newSupplyUnit, setNewSupplyUnit] = useState("unit");

  // Equipment purchase mode (depreciation)
  const [salvageValue, setSalvageValue] = useState("0");
  const [usefulLifeYears, setUsefulLifeYears] = useState("5");

  // Livestock purchase mode
  const [livestockChoice, setLivestockChoice] = useState<"new" | "existing">("new");
  const [animalId, setAnimalId] = useState(animals[0]?.id ?? "");
  const [newEarTag, setNewEarTag] = useState("");
  const [newBreed, setNewBreed] = useState("");
  const [newBirthDate, setNewBirthDate] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function switchMode(next: typeof mode) {
    setMode(next);
    setError(null);
    if (next === "seed") {
      const crop = crops.find((c) => c.id === cropId) ?? crops[0];
      setCategory("Seeds");
      if (crop && !item) setItem(`${crop.name} seed`);
    }
    if (next === "supply") {
      const supply = supplies.find((s) => s.supply_id === supplyId);
      setCategory("Supplies");
      if (supply && !item) setItem(supply.name);
    }
    if (next === "equipment") {
      setCategory("Equipment");
    }
    if (next === "livestock") {
      setCategory("Livestock");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (DEMO_MODE) { onDone(); return; }

      let resolvedSupplyId: string | null = null;
      if (mode === "supply") {
        if (supplyId === NEW_SUPPLY || !supplyId) {
          if (!newSupplyName.trim()) throw new Error("Enter a name for the new item.");
          const { data: newSupply, error: supplyError } = await supabase
            .from("farm_supplies")
            .insert({
              org_id: orgId,
              name: newSupplyName.trim(),
              category: newSupplyCategory,
              unit: newSupplyUnit.trim() || "unit",
            })
            .select("id")
            .single();
          if (supplyError) throw supplyError;
          resolvedSupplyId = newSupply.id;
        } else {
          resolvedSupplyId = supplyId;
        }
      }

      let resolvedAnimalId: string | null = null;
      if (mode === "livestock") {
        if (livestockChoice === "new") {
          if (!newEarTag.trim()) throw new Error("Enter an ear tag / ID for the new animal.");
          const { data: newAnimal, error: animalError } = await supabase
            .from("animals")
            .insert({
              org_id: orgId,
              ear_tag_number: newEarTag.trim(),
              breed: newBreed.trim() || null,
              birth_date: newBirthDate || null,
            })
            .select("id")
            .single();
          if (animalError) throw animalError;
          resolvedAnimalId = newAnimal.id;
        } else {
          if (!animalId) throw new Error("Select an animal.");
          resolvedAnimalId = animalId;
        }
      }

      const { data: purchase, error: purchaseError } = await supabase
        .from("purchases")
        .insert({
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
          supply_id: mode === "supply" ? resolvedSupplyId : null,
          supply_qty: mode === "supply" && supplyQty ? Number(supplyQty) : null,
          animal_id: mode === "livestock" ? resolvedAnimalId : null,
          tax_deductible: taxDeductible,
        })
        .select("id")
        .single();
      if (purchaseError) throw purchaseError;

      if (mode === "equipment") {
        const { error: equipError } = await supabase.from("equipment_assets").insert({
          org_id: orgId,
          name: item,
          purchase_date: date,
          cost: Number(cost) || 0,
          salvage_value: Number(salvageValue) || 0,
          useful_life_years: Number(usefulLifeYears) || 5,
          purchase_id: purchase.id,
        });
        if (equipError) throw equipError;
      }

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
      <div className="flex flex-wrap rounded-lg bg-stone-100 p-1 text-sm font-medium gap-y-1">
        {([
          ["general", "General purchase"],
          ["seed", "Seed purchase"],
          ["supply", "Supply purchase"],
          ["equipment", "Equipment"],
          ["livestock", "Livestock"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`flex-1 min-w-[7rem] rounded-md py-1.5 px-2 transition-colors ${mode === key ? "bg-white shadow-sm text-brand-700" : "text-stone-500"}`}
            onClick={() => switchMode(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "seed" && (
        <p className="text-xs text-stone-400 -mt-2">
          Adds straight to that crop&apos;s seed inventory (grams on hand) as soon as you save.
        </p>
      )}
      {mode === "supply" && (
        <p className="text-xs text-stone-400 -mt-2">
          Adds straight to that item&apos;s stock on hand as soon as you save. No item yet? Pick
          &quot;+ New item&quot; below and add it right here.
        </p>
      )}
      {mode === "equipment" && (
        <p className="text-xs text-stone-400 -mt-2">
          Logs the purchase and starts tracking straight-line depreciation for this asset — see it
          on the Purchases page under Equipment.
        </p>
      )}
      {mode === "livestock" && (
        <p className="text-xs text-stone-400 -mt-2">
          Ties this purchase to an animal record so its cost counts toward that animal&apos;s
          profitability on the Profitability page.
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
          <>
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
                <option value={NEW_SUPPLY}>+ New item…</option>
              </select>
            </div>
            {supplyId === NEW_SUPPLY ? (
              <>
                <div>
                  <label className="label">New item name</label>
                  <input className="input" value={newSupplyName} onChange={(e) => { setNewSupplyName(e.target.value); if (!item) setItem(e.target.value); }} required />
                </div>
                <div>
                  <label className="label">Category</label>
                  <select className="input" value={newSupplyCategory} onChange={(e) => setNewSupplyCategory(e.target.value as any)}>
                    <option value="nutrient">Nutrient</option>
                    <option value="feed">Feed</option>
                    <option value="commercial_seed">Commercial seed</option>
                    <option value="equipment">Equipment (stock item)</option>
                  </select>
                </div>
                <div>
                  <label className="label">Unit</label>
                  <input className="input" value={newSupplyUnit} onChange={(e) => setNewSupplyUnit(e.target.value)} placeholder="lb, gal, bag…" />
                </div>
                <div>
                  <label className="label">Qty purchased ({newSupplyUnit || "unit"})</label>
                  <input className="input" type="number" step="0.01" value={supplyQty} onChange={(e) => setSupplyQty(e.target.value)} required />
                </div>
              </>
            ) : (
              <div>
                <label className="label">Qty purchased ({supplies.find((s) => s.supply_id === supplyId)?.unit ?? "unit"})</label>
                <input className="input" type="number" step="0.01" value={supplyQty} onChange={(e) => setSupplyQty(e.target.value)} required />
              </div>
            )}
          </>
        )}

        {mode === "equipment" && (
          <>
            <div>
              <label className="label">Salvage value ($)</label>
              <input className="input" type="number" step="0.01" value={salvageValue} onChange={(e) => setSalvageValue(e.target.value)} />
              <p className="text-xs text-stone-400 mt-1">What it'll be worth at the end of its useful life. 0 if none.</p>
            </div>
            <div>
              <label className="label">Useful life (years)</label>
              <input className="input" type="number" step="0.5" min="0.5" value={usefulLifeYears} onChange={(e) => setUsefulLifeYears(e.target.value)} />
            </div>
          </>
        )}

        {mode === "livestock" && (
          <>
            <div className="sm:col-span-3 flex rounded-lg bg-stone-50 border border-stone-200 p-1 text-sm font-medium max-w-sm">
              <button
                type="button"
                className={`flex-1 rounded-md py-1.5 transition-colors ${livestockChoice === "new" ? "bg-white shadow-sm text-brand-700" : "text-stone-500"}`}
                onClick={() => setLivestockChoice("new")}
              >
                New animal
              </button>
              <button
                type="button"
                className={`flex-1 rounded-md py-1.5 transition-colors ${livestockChoice === "existing" ? "bg-white shadow-sm text-brand-700" : "text-stone-500"}`}
                onClick={() => setLivestockChoice("existing")}
                disabled={animals.length === 0}
              >
                Existing animal
              </button>
            </div>
            {livestockChoice === "new" ? (
              <>
                <div>
                  <label className="label">Ear tag / ID</label>
                  <input
                    className="input"
                    value={newEarTag}
                    onChange={(e) => { setNewEarTag(e.target.value); if (!item) setItem(`Animal ${e.target.value}`); }}
                    required
                  />
                </div>
                <div>
                  <label className="label">Breed (optional)</label>
                  <input className="input" value={newBreed} onChange={(e) => setNewBreed(e.target.value)} />
                </div>
                <div>
                  <label className="label">Birth date (optional)</label>
                  <input className="input" type="date" value={newBirthDate} onChange={(e) => setNewBirthDate(e.target.value)} />
                </div>
              </>
            ) : (
              <div>
                <label className="label">Animal</label>
                <select
                  className="input"
                  value={animalId}
                  onChange={(e) => {
                    setAnimalId(e.target.value);
                    const a = animals.find((x) => x.id === e.target.value);
                    if (a && !item) setItem(a.ear_tag_number);
                  }}
                >
                  {animals.map((a) => <option key={a.id} value={a.id}>{a.ear_tag_number}</option>)}
                </select>
              </div>
            )}
          </>
        )}

        <div className={mode === "seed" ? "" : "sm:col-span-2"}>
          <label className="label">Item</label>
          <input className="input" value={item} onChange={(e) => setItem(e.target.value)} required />
        </div>
        <div>
          <label className="label">Category</label>
          <select
            className="input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={mode === "seed" || mode === "supply" || mode === "equipment" || mode === "livestock"}
          >
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
