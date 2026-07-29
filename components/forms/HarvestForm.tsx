"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";
import { defaultWeightUnit, weightToGrams, WEIGHT_UNIT_OPTIONS, type WeightUnit } from "@/lib/units";
import { isNetworkError } from "@/lib/offlineQueue";
import { useOfflineSubmit } from "@/lib/useOfflineSubmit";
import OfflineQueuedPanel from "@/components/OfflineQueuedPanel";

type Batch = { id: string; batch_id: string; dry_seed_weight_g: number | null };

export default function HarvestForm({
  orgId, batch, weightUnit, onDone,
}: { orgId: string; batch: Batch; weightUnit?: string; onDone: () => void }) {
  const supabase = createClient();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().slice(0, 10));
  const [freshOz, setFreshOz] = useState("");
  const [wasteOz, setWasteOz] = useState("");
  // Lets someone enter a harvest weight in whatever unit is easiest for them (a kitchen scale in
  // grams, a hanging scale in pounds, etc.) — always converted to grams before saving, so the
  // stored value stays consistent regardless of which unit was used to enter it.
  const [unit, setUnit] = useState<WeightUnit>(defaultWeightUnit(weightUnit));
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skippedPhoto, setSkippedPhoto] = useState(false);
  const { queued, attemptOrQueue } = useOfflineSubmit();

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPhoto(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (DEMO_MODE) { onDone(); return; }
      const freshG = freshOz ? weightToGrams(Number(freshOz), unit) : null;
      const wasteG = wasteOz ? weightToGrams(Number(wasteOz), unit) : null;
      const yieldRatio = freshG && batch.dry_seed_weight_g ? freshG / batch.dry_seed_weight_g : null;

      const offlineNow = typeof navigator !== "undefined" && navigator.onLine === false;

      // A photo upload is a binary file to Storage, not a row write — this queue only knows how
      // to replay simple table inserts/updates, so a photo taken offline can't be queued the same
      // way. Skip it outright when offline rather than trying and failing partway through; the
      // rest of the harvest data still saves normally via the queue below.
      let photoUrl: string | undefined;
      if (photo && !offlineNow) {
        try {
          const ext = photo.name.split(".").pop() || "jpg";
          const path = `${orgId}/${batch.batch_id}-${Date.now()}.${ext}`;
          const { error: uploadError } = await supabase.storage.from("harvest-photos").upload(path, photo);
          if (uploadError) throw uploadError;
          photoUrl = path;
        } catch (uploadErr) {
          if (!isNetworkError(uploadErr)) throw uploadErr;
          setSkippedPhoto(true);
        }
      } else if (photo && offlineNow) {
        setSkippedPhoto(true);
      }

      const updatePayload = {
        status: "harvested",
        harvest_date: harvestDate,
        fresh_harvest_weight_g: freshG,
        waste_mass_g: wasteG,
        yield_ratio: yieldRatio,
        ...(photoUrl ? { photo_url: photoUrl } : {}),
      };

      const result = await attemptOrQueue(
        async () => {
          const { error } = await supabase.from("batches").update(updatePayload).eq("id", batch.id);
          if (error) throw error;
        },
        {
          table: "batches",
          op: "update",
          matchColumn: "id",
          matchValue: batch.id,
          // Deliberately the payload without photo_url — a queued write can't carry a photo (see
          // the skip logic above), so it's left out here rather than referencing a photoUrl that,
          // if this branch is reached, never got uploaded.
          payload: {
            status: "harvested",
            harvest_date: harvestDate,
            fresh_harvest_weight_g: freshG,
            waste_mass_g: wasteG,
            yield_ratio: yieldRatio,
          },
          label: `Harvest — ${batch.batch_id}`,
        }
      );
      if (!result.ok) {
        if (photo) setSkippedPhoto(true);
        setTimeout(onDone, 1200);
        return;
      }
      onDone();
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Could not save harvest";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  if (queued) {
    return (
      <OfflineQueuedPanel>
        {skippedPhoto && (
          <p className="text-xs text-stone-500">The photo wasn't attached — photos need a live connection to upload, and can't be queued. Add it later by editing this harvest once you're back online.</p>
        )}
      </OfflineQueuedPanel>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 p-3 rounded-lg border border-emerald-200 bg-emerald-50/60 space-y-2">
      <div className="text-xs font-medium text-stone-600">Mark {batch.batch_id} harvested</div>
      <div className="grid sm:grid-cols-3 gap-2">
        <div>
          <label className="label !text-[11px]">Harvest date</label>
          <input className="input !py-1.5 text-sm" type="date" value={harvestDate} onChange={(e) => setHarvestDate(e.target.value)} />
        </div>
        <div>
          <label className="label !text-[11px]">Fresh harvest weight</label>
          <input className="input !py-1.5 text-sm" type="number" step="0.1" value={freshOz} onChange={(e) => setFreshOz(e.target.value)} required />
        </div>
        <div>
          <label className="label !text-[11px]">Waste (optional)</label>
          <input className="input !py-1.5 text-sm" type="number" step="0.1" value={wasteOz} onChange={(e) => setWasteOz(e.target.value)} />
        </div>
        <div>
          <label className="label !text-[11px]">Unit</label>
          <select className="input !py-1.5 text-sm" value={unit} onChange={(e) => setUnit(e.target.value as WeightUnit)}>
            {WEIGHT_UNIT_OPTIONS.map((u) => <option key={u.key} value={u.key}>{u.key}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label !text-[11px]">Harvest photo (optional)</label>
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoChange}
            className="text-xs text-stone-500 file:mr-2 file:rounded-md file:border-0 file:bg-emerald-100 file:px-2 file:py-1 file:text-xs file:font-medium file:text-emerald-700"
          />
          {photoPreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoPreview} alt="Harvest preview" className="h-10 w-10 rounded object-cover border border-stone-200" />
          )}
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" className="btn-secondary !py-1 !px-2 text-xs" onClick={onDone}>Cancel</button>
        <button type="submit" className="btn-primary !py-1 !px-2 text-xs" disabled={saving}>{saving ? "Saving…" : "Save harvest"}</button>
      </div>
    </form>
  );
}
