"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";

type Crop = {
  id: string;
  name: string;
  is_premium: boolean;
  seed_type: string | null;
  presoak: string | null;
  sterilization: string | null;
  mat_setup: string | null;
  blackout_days: string | null;
  light_days: string | null;
  total_cycle_days_min: number | null;
  total_cycle_days_max: number | null;
  watering_schedule: string | null;
  harvest_window: string | null;
  cut_height: string | null;
  packaging: string | null;
  storage_temp: string | null;
  seed_cost_per_g: number | null;
  sow_rate_g: number | null;
  low_stock_threshold_trays: number | null;
  oz_per_tray: number | null;
  oz_per_clamshell: number | null;
  notes: string | null;
  crop_family: string | null;
  applicable_to: string[] | null;
};

export default function CropForm({ orgId, crop, onDone }: { orgId: string; crop?: Crop; onDone: () => void }) {
  const supabase = createClient();
  const router = useRouter();
  const isEdit = !!crop;

  const [name, setName] = useState(crop?.name ?? "");
  const [isPremium, setIsPremium] = useState(crop?.is_premium ?? false);
  const [seedType, setSeedType] = useState(crop?.seed_type ?? "");
  const [presoak, setPresoak] = useState(crop?.presoak ?? "");
  const [sterilization, setSterilization] = useState(crop?.sterilization ?? "");
  const [matSetup, setMatSetup] = useState(crop?.mat_setup ?? "");
  const [blackoutDays, setBlackoutDays] = useState(crop?.blackout_days ?? "");
  const [lightDays, setLightDays] = useState(crop?.light_days ?? "");
  const [cycleMin, setCycleMin] = useState(crop?.total_cycle_days_min?.toString() ?? "");
  const [cycleMax, setCycleMax] = useState(crop?.total_cycle_days_max?.toString() ?? "");
  const [wateringSchedule, setWateringSchedule] = useState(crop?.watering_schedule ?? "");
  const [harvestWindow, setHarvestWindow] = useState(crop?.harvest_window ?? "");
  const [cutHeight, setCutHeight] = useState(crop?.cut_height ?? "");
  const [packaging, setPackaging] = useState(crop?.packaging ?? "Clamshell");
  const [storageTemp, setStorageTemp] = useState(crop?.storage_temp ?? "36-40F");
  const [seedCostPerG, setSeedCostPerG] = useState(crop?.seed_cost_per_g?.toString() ?? "");
  const [sowRateG, setSowRateG] = useState(crop?.sow_rate_g?.toString() ?? "");
  const [lowStockTrays, setLowStockTrays] = useState(crop?.low_stock_threshold_trays?.toString() ?? "");
  const [ozPerTray, setOzPerTray] = useState(crop?.oz_per_tray?.toString() ?? "");
  const [ozPerClamshell, setOzPerClamshell] = useState(crop?.oz_per_clamshell?.toString() ?? "");
  const [notes, setNotes] = useState(crop?.notes ?? "");
  const [cropFamily, setCropFamily] = useState(crop?.crop_family ?? "");
  const [applicableTo, setApplicableTo] = useState<string[]>(crop?.applicable_to ?? ["microgreens"]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (DEMO_MODE) {
        onDone();
        return;
      }
      const payload = {
        name,
        is_premium: isPremium,
        seed_type: seedType || null,
        presoak: presoak || null,
        sterilization: sterilization || null,
        mat_setup: matSetup || null,
        blackout_days: blackoutDays || null,
        light_days: lightDays || null,
        total_cycle_days_min: cycleMin ? Number(cycleMin) : null,
        total_cycle_days_max: cycleMax ? Number(cycleMax) : null,
        watering_schedule: wateringSchedule || null,
        harvest_window: harvestWindow || null,
        cut_height: cutHeight || null,
        packaging: packaging || null,
        storage_temp: storageTemp || null,
        seed_cost_per_g: seedCostPerG ? Number(seedCostPerG) : null,
        sow_rate_g: sowRateG ? Number(sowRateG) : null,
        low_stock_threshold_trays: lowStockTrays ? Number(lowStockTrays) : null,
        oz_per_tray: ozPerTray ? Number(ozPerTray) : null,
        oz_per_clamshell: ozPerClamshell ? Number(ozPerClamshell) : null,
        notes: notes || null,
        crop_family: cropFamily || null,
        applicable_to: applicableTo.length > 0 ? applicableTo : ["microgreens"],
      };

      if (isEdit && crop) {
        const { error } = await supabase.from("crops").update(payload).eq("id", crop.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("crops").insert({ org_id: orgId, ...payload });
        if (error) throw error;
      }
      onDone();
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Could not save crop";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 mb-4 space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="label">Crop name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Basil" required />
        </div>

        <div>
          <label className="label">Seed type</label>
          <input className="input" value={seedType} onChange={(e) => setSeedType(e.target.value)} placeholder="Standard, Large, Cluster…" />
        </div>
        <div>
          <label className="label">Seed cost per gram ($)</label>
          <input className="input" type="number" step="0.0001" min="0" value={seedCostPerG} onChange={(e) => setSeedCostPerG(e.target.value)} placeholder="e.g. 0.0371" />
        </div>

        <div>
          <label className="label">Presoak</label>
          <input className="input" value={presoak} onChange={(e) => setPresoak(e.target.value)} placeholder="None, 8 hours…" />
        </div>
        <div>
          <label className="label">Sterilization</label>
          <input className="input" value={sterilization} onChange={(e) => setSterilization(e.target.value)} placeholder="5-10 min H2O2…" />
        </div>

        <div>
          <label className="label">Mat setup</label>
          <input className="input" value={matSetup} onChange={(e) => setMatSetup(e.target.value)} placeholder="Single Mat, Double Mat…" />
        </div>
        <div>
          <label className="label">Cut height</label>
          <input className="input" value={cutHeight} onChange={(e) => setCutHeight(e.target.value)} placeholder="1/2 inch above soil" />
        </div>

        <div>
          <label className="label">Blackout period</label>
          <input className="input" value={blackoutDays} onChange={(e) => setBlackoutDays(e.target.value)} placeholder="3-4 Days" />
        </div>
        <div>
          <label className="label">Light days</label>
          <input className="input" value={lightDays} onChange={(e) => setLightDays(e.target.value)} placeholder="4-8 Days" />
        </div>

        <div>
          <label className="label">Total cycle — min days</label>
          <input className="input" type="number" min="0" value={cycleMin} onChange={(e) => setCycleMin(e.target.value)} />
        </div>
        <div>
          <label className="label">Total cycle — max days</label>
          <input className="input" type="number" min="0" value={cycleMax} onChange={(e) => setCycleMax(e.target.value)} />
        </div>

        <div>
          <label className="label">Watering schedule</label>
          <input className="input" value={wateringSchedule} onChange={(e) => setWateringSchedule(e.target.value)} placeholder="Bottom-water daily…" />
        </div>
        <div>
          <label className="label">Harvest window</label>
          <input className="input" value={harvestWindow} onChange={(e) => setHarvestWindow(e.target.value)} placeholder="8-12 Days" />
        </div>

        <div>
          <label className="label">Packaging</label>
          <input className="input" value={packaging} onChange={(e) => setPackaging(e.target.value)} />
        </div>
        <div>
          <label className="label">Storage temp</label>
          <input className="input" value={storageTemp} onChange={(e) => setStorageTemp(e.target.value)} />
        </div>

        <div>
          <label className="label">Sow rate (g of seed / tray)</label>
          <input className="input" type="number" step="0.1" min="0" value={sowRateG} onChange={(e) => setSowRateG(e.target.value)} placeholder="e.g. 20" />
          <p className="text-xs text-stone-400 mt-1">Drives Inventory's "sowable trays remaining" and the low-seed flag on Batches.</p>
        </div>
        <div>
          <label className="label">Low-stock alert (trays remaining)</label>
          <input className="input" type="number" step="0.1" min="0" value={lowStockTrays} onChange={(e) => setLowStockTrays(e.target.value)} placeholder="e.g. 10" />
        </div>

        <div>
          <label className="label">Oz per tray (for tray sales)</label>
          <input className="input" type="number" step="0.1" min="0" value={ozPerTray} onChange={(e) => setOzPerTray(e.target.value)} placeholder="e.g. 8" />
          <p className="text-xs text-stone-400 mt-1">Lets a "by tray" sale correctly deduct harvested inventory.</p>
        </div>
        <div>
          <label className="label">Oz per clamshell (for clamshell sales)</label>
          <input className="input" type="number" step="0.1" min="0" value={ozPerClamshell} onChange={(e) => setOzPerClamshell(e.target.value)} placeholder="e.g. 2" />
        </div>

        <div>
          <label className="label">Crop family (for rotation tracking)</label>
          <input className="input" value={cropFamily} onChange={(e) => setCropFamily(e.target.value)} placeholder="e.g. Brassicaceae" />
          <p className="text-xs text-stone-400 mt-1">Used by Fields to warn when the same family is replanted in the same spot too soon.</p>
        </div>
        <div>
          <label className="label">Used for</label>
          <div className="flex gap-3 mt-2">
            {[
              { key: "microgreens", label: "Microgreens (Batches)" },
              { key: "field_crop", label: "Field crop (Fields)" },
            ].map((opt) => (
              <label key={opt.key} className="flex items-center gap-1.5 text-sm text-stone-600">
                <input
                  type="checkbox"
                  checked={applicableTo.includes(opt.key)}
                  onChange={(e) =>
                    setApplicableTo((prev) =>
                      e.target.checked ? [...prev, opt.key] : prev.filter((k) => k !== opt.key)
                    )
                  }
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <div className="sm:col-span-2">
          <label className="label">Notes</label>
          <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything worth remembering about this crop" />
        </div>

        <div className="sm:col-span-2 flex items-center gap-2">
          <input id="is_premium" type="checkbox" checked={isPremium} onChange={(e) => setIsPremium(e.target.checked)} className="h-4 w-4 rounded border-stone-300" />
          <label htmlFor="is_premium" className="text-sm text-stone-600">Premium / specialty crop (priced higher)</label>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" className="btn-secondary" onClick={onDone}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : isEdit ? "Save changes" : "Add crop"}</button>
      </div>
    </form>
  );
}
