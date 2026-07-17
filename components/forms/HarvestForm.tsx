"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";

const OZ_TO_G = 28.349523125;

type Batch = { id: string; batch_id: string; dry_seed_weight_g: number | null };

export default function HarvestForm({ orgId, batch, onDone }: { orgId: string; batch: Batch; onDone: () => void }) {
  const supabase = createClient();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().slice(0, 10));
  const [freshOz, setFreshOz] = useState("");
  const [wasteOz, setWasteOz] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const freshG = freshOz ? Number(freshOz) * OZ_TO_G : null;
      const wasteG = wasteOz ? Number(wasteOz) * OZ_TO_G : null;
      const yieldRatio = freshG && batch.dry_seed_weight_g ? freshG / batch.dry_seed_weight_g : null;

      let photoUrl: string | undefined;
      if (photo) {
        const ext = photo.name.split(".").pop() || "jpg";
        const path = `${orgId}/${batch.batch_id}-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("harvest-photos").upload(path, photo);
        if (uploadError) throw uploadError;
        photoUrl = path;
      }

      const { error } = await supabase.from("batches").update({
        status: "harvested",
        harvest_date: harvestDate,
        fresh_harvest_weight_g: freshG,
        waste_mass_g: wasteG,
        yield_ratio: yieldRatio,
        ...(photoUrl ? { photo_url: photoUrl } : {}),
      }).eq("id", batch.id);
      if (error) throw error;
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

  return (
    <form onSubmit={handleSubmit} className="mt-2 p-3 rounded-lg border border-emerald-200 bg-emerald-50/60 space-y-2">
      <div className="text-xs font-medium text-stone-600">Mark {batch.batch_id} harvested</div>
      <div className="grid sm:grid-cols-3 gap-2">
        <div>
          <label className="label !text-[11px]">Harvest date</label>
          <input className="input !py-1.5 text-sm" type="date" value={harvestDate} onChange={(e) => setHarvestDate(e.target.value)} />
        </div>
        <div>
          <label className="label !text-[11px]">Fresh harvest weight (oz)</label>
          <input className="input !py-1.5 text-sm" type="number" step="0.1" value={freshOz} onChange={(e) => setFreshOz(e.target.value)} required />
        </div>
        <div>
          <label className="label !text-[11px]">Waste (oz, optional)</label>
          <input className="input !py-1.5 text-sm" type="number" step="0.1" value={wasteOz} onChange={(e) => setWasteOz(e.target.value)} />
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
