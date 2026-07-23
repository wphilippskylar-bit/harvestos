"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";
import { errorMessage } from "@/lib/errors";

export default function SoilTestForm({
  orgId, fieldId, rowId, onDone,
}: { orgId: string; fieldId: string; rowId?: string | null; onDone: () => void }) {
  const supabase = createClient();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [testDate, setTestDate] = useState(new Date().toISOString().slice(0, 10));
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [ph, setPh] = useState("");
  const [n, setN] = useState("");
  const [p, setP] = useState("");
  const [k, setK] = useState("");
  const [om, setOm] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractNote, setExtractNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPhoto(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
    setExtractNote(null);
  }

  async function extractFromPhoto() {
    if (!photo) return;
    setExtracting(true);
    setExtractNote(null);
    setError(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(photo);
      });
      const res = await fetch("/api/soil-test/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType: photo.type || "image/jpeg" }),
      });
      const json = await res.json();
      if (!res.ok) { setExtractNote(json.error || "Could not read the photo."); return; }
      const ex = json.extracted;
      if (ex.ph != null) setPh(String(ex.ph));
      if (ex.nitrogen_ppm != null) setN(String(ex.nitrogen_ppm));
      if (ex.phosphorus_ppm != null) setP(String(ex.phosphorus_ppm));
      if (ex.potassium_ppm != null) setK(String(ex.potassium_ppm));
      if (ex.organic_matter_pct != null) setOm(String(ex.organic_matter_pct));
      setExtractNote(
        `Filled in from the photo — double-check these before saving.${ex.confidence_notes ? ` (${ex.confidence_notes})` : ""}`
      );
    } catch (err) {
      setExtractNote(errorMessage(err, "Could not read the photo."));
    } finally {
      setExtracting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (DEMO_MODE) { onDone(); return; }
      let photoUrl: string | undefined;
      if (photo) {
        const ext = photo.name.split(".").pop() || "jpg";
        const path = `${orgId}/${fieldId}-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("soil-tests").upload(path, photo);
        if (uploadError) throw uploadError;
        photoUrl = path;
      }
      const { error: insertError } = await supabase.from("soil_tests").insert({
        org_id: orgId,
        field_id: fieldId,
        row_id: rowId || null,
        test_date: testDate,
        photo_url: photoUrl,
        ph: ph ? Number(ph) : null,
        nitrogen_ppm: n ? Number(n) : null,
        phosphorus_ppm: p ? Number(p) : null,
        potassium_ppm: k ? Number(k) : null,
        organic_matter_pct: om ? Number(om) : null,
      });
      if (insertError) throw insertError;
      onDone();
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, "Could not save soil test"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 p-3 rounded-lg border border-amber-200 bg-amber-50/60 space-y-2">
      <div className="text-xs font-medium text-stone-600">Add soil test</div>
      <div>
        <label className="label !text-[11px]">Photo or document (optional)</label>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoChange}
            className="text-xs text-stone-500 file:mr-2 file:rounded-md file:border-0 file:bg-amber-100 file:px-2 file:py-1 file:text-xs file:font-medium file:text-amber-800"
          />
          {photoPreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoPreview} alt="Soil test preview" className="h-10 w-10 rounded object-cover border border-stone-200" />
          )}
          {photo && (
            <button type="button" className="btn-secondary !py-1 !px-2 text-xs" onClick={extractFromPhoto} disabled={extracting}>
              {extracting ? "Reading photo…" : "Fill in from photo"}
            </button>
          )}
        </div>
        {extractNote && <p className="text-xs text-stone-500 mt-1">{extractNote}</p>}
      </div>
      <div className="grid sm:grid-cols-5 gap-2">
        <div>
          <label className="label !text-[11px]">Test date</label>
          <input className="input !py-1.5 text-sm" type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} />
        </div>
        <div>
          <label className="label !text-[11px]">pH</label>
          <input className="input !py-1.5 text-sm" type="number" step="0.1" value={ph} onChange={(e) => setPh(e.target.value)} />
        </div>
        <div>
          <label className="label !text-[11px]">N (ppm)</label>
          <input className="input !py-1.5 text-sm" type="number" step="0.1" value={n} onChange={(e) => setN(e.target.value)} />
        </div>
        <div>
          <label className="label !text-[11px]">P (ppm)</label>
          <input className="input !py-1.5 text-sm" type="number" step="0.1" value={p} onChange={(e) => setP(e.target.value)} />
        </div>
        <div>
          <label className="label !text-[11px]">K (ppm)</label>
          <input className="input !py-1.5 text-sm" type="number" step="0.1" value={k} onChange={(e) => setK(e.target.value)} />
        </div>
      </div>
      <div className="max-w-[160px]">
        <label className="label !text-[11px]">Organic matter (%)</label>
        <input className="input !py-1.5 text-sm" type="number" step="0.1" value={om} onChange={(e) => setOm(e.target.value)} />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" className="btn-secondary !py-1 !px-2 text-xs" onClick={onDone}>Cancel</button>
        <button type="submit" className="btn-primary !py-1 !px-2 text-xs" disabled={saving}>{saving ? "Saving…" : "Save soil test"}</button>
      </div>
    </form>
  );
}
