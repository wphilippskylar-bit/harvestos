"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";
import { errorMessage } from "@/lib/errors";

type Planting = { id: string; crop_name_snapshot: string | null };

export default function CeaEnvLogForm({
  orgId, areaId, plantings = [], onDone,
}: {
  orgId: string;
  areaId: string;
  plantings?: Planting[];
  onDone: () => void;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [plantingId, setPlantingId] = useState("");
  const [temp, setTemp] = useState("");
  const [humidity, setHumidity] = useState("");
  const [vpd, setVpd] = useState("");
  const [co2, setCo2] = useState("");
  const [lightHours, setLightHours] = useState("16");
  const [lightIntensity, setLightIntensity] = useState("");
  const [wateringVolume, setWateringVolume] = useState("");
  const [waterPh, setWaterPh] = useState("");
  const [nutrientEc, setNutrientEc] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (DEMO_MODE) { onDone(); return; }
      const { error } = await supabase.from("cea_environment_logs").insert({
        org_id: orgId,
        area_id: areaId,
        planting_id: plantingId || null,
        log_date: date,
        temperature_f: temp ? Number(temp) : null,
        humidity_pct: humidity ? Number(humidity) : null,
        vpd_kpa: vpd ? Number(vpd) : null,
        co2_ppm: co2 ? Number(co2) : null,
        light_schedule_hours: lightHours ? Number(lightHours) : null,
        light_intensity_ppfd: lightIntensity ? Number(lightIntensity) : null,
        watering_volume_ml: wateringVolume ? Number(wateringVolume) : null,
        water_ph: waterPh ? Number(waterPh) : null,
        nutrient_ec: nutrientEc ? Number(nutrientEc) : null,
        notes: notes || null,
      });
      if (error) throw error;
      onDone();
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, "Could not save log"));
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
        {plantings.length > 0 && (
          <div>
            <label className="label">Planting (optional)</label>
            <select className="input" value={plantingId} onChange={(e) => setPlantingId(e.target.value)}>
              <option value="">—</option>
              {plantings.map((p) => <option key={p.id} value={p.id}>{p.crop_name_snapshot ?? "Untitled planting"}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="label">Temperature (°F)</label>
          <input className="input" type="number" step="0.1" value={temp} onChange={(e) => setTemp(e.target.value)} />
        </div>
        <div>
          <label className="label">Humidity (%)</label>
          <input className="input" type="number" step="0.1" value={humidity} onChange={(e) => setHumidity(e.target.value)} />
        </div>
        <div>
          <label className="label">VPD (kPa)</label>
          <input className="input" type="number" step="0.01" value={vpd} onChange={(e) => setVpd(e.target.value)} />
        </div>
        <div>
          <label className="label">CO2 (ppm)</label>
          <input className="input" type="number" step="1" value={co2} onChange={(e) => setCo2(e.target.value)} />
        </div>
        <div>
          <label className="label">Light schedule (hrs)</label>
          <input className="input" type="number" step="0.5" value={lightHours} onChange={(e) => setLightHours(e.target.value)} />
        </div>
        <div>
          <label className="label">Light intensity (PPFD)</label>
          <input className="input" type="number" step="1" value={lightIntensity} onChange={(e) => setLightIntensity(e.target.value)} />
        </div>
        <div>
          <label className="label">Watering volume (mL)</label>
          <input className="input" type="number" step="1" value={wateringVolume} onChange={(e) => setWateringVolume(e.target.value)} />
        </div>
        <div>
          <label className="label">Water pH</label>
          <input className="input" type="number" step="0.1" value={waterPh} onChange={(e) => setWaterPh(e.target.value)} />
        </div>
        <div>
          <label className="label">Nutrient EC</label>
          <input className="input" type="number" step="0.01" value={nutrientEc} onChange={(e) => setNutrientEc(e.target.value)} />
        </div>
        <div className="sm:col-span-3">
          <label className="label">Notes / observations</label>
          <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Pests, disease, anything unusual…" />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" className="btn-secondary" onClick={onDone}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Save log"}</button>
      </div>
    </form>
  );
}
