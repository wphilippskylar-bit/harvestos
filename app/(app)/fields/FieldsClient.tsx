"use client";

import { Fragment, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";
import { EmptyState, StatusBadge } from "@/components/ui";
import FieldForm from "@/components/forms/FieldForm";
import PlantingForm from "@/components/forms/PlantingForm";
import SoilTestForm from "@/components/forms/SoilTestForm";

type Field = {
  id: string;
  name: string;
  is_high_tunnel: boolean;
  field_rows: { id: string; label: string }[];
  plantings: { id: string; status: string }[];
  soil_tests: { id: string; test_date: string }[];
};
type Crop = { id: string; name: string; crop_family: string | null };

type FieldDetail = {
  plantings: any[];
  soilTests: any[];
  nutrients: any[];
};

export default function FieldsClient({
  orgId, role, fields, crops,
}: { orgId: string; role: string; fields: Field[]; crops: Crop[] }) {
  const supabase = createClient();
  const isEditor = role === "owner" || role === "admin" || role === "member";
  const [showFieldForm, setShowFieldForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, FieldDetail>>({});
  const [activeForm, setActiveForm] = useState<{ fieldId: string; kind: "planting" | "soil" | "nutrient" } | null>(null);
  const [nutrientDate, setNutrientDate] = useState(new Date().toISOString().slice(0, 10));
  const [nutrientProduct, setNutrientProduct] = useState("");
  const [nutrientRate, setNutrientRate] = useState("");
  const [savingNutrient, setSavingNutrient] = useState(false);

  async function loadDetail(fieldId: string) {
    if (DEMO_MODE) { setDetails((d) => ({ ...d, [fieldId]: { plantings: [], soilTests: [], nutrients: [] } })); return; }
    const [{ data: plantings }, { data: soilTests }, { data: nutrients }] = await Promise.all([
      supabase.from("plantings").select("*").eq("field_id", fieldId).order("planted_date", { ascending: false }),
      supabase.from("soil_tests").select("*").eq("field_id", fieldId).order("test_date", { ascending: false }),
      supabase.from("nutrient_applications").select("*").eq("field_id", fieldId).order("applied_date", { ascending: false }),
    ]);
    setDetails((d) => ({ ...d, [fieldId]: { plantings: plantings ?? [], soilTests: soilTests ?? [], nutrients: nutrients ?? [] } }));
  }

  function toggleExpand(fieldId: string) {
    if (expandedId === fieldId) { setExpandedId(null); return; }
    setExpandedId(fieldId);
    setActiveForm(null);
    if (!details[fieldId]) loadDetail(fieldId);
  }

  function refreshDetail(fieldId: string) {
    setActiveForm(null);
    loadDetail(fieldId);
  }

  async function saveNutrient(fieldId: string) {
    if (!nutrientProduct.trim()) return;
    setSavingNutrient(true);
    if (!DEMO_MODE) {
      await supabase.from("nutrient_applications").insert({
        org_id: orgId, field_id: fieldId, applied_date: nutrientDate, product_name: nutrientProduct.trim(), application_rate: nutrientRate.trim() || null,
      });
    }
    setSavingNutrient(false);
    setNutrientProduct("");
    setNutrientRate("");
    refreshDetail(fieldId);
  }

  if (fields.length === 0 && !showFieldForm) {
    return (
      <div className="space-y-4">
        <EmptyState
          title="No fields yet"
          hint="Add a field to start tracking plantings, soil tests, and crop rotation for row crops, high tunnels, or commercial ground."
        />
        {isEditor && (
          <div className="flex justify-center">
            <button className="btn-primary" onClick={() => setShowFieldForm(true)}>Add your first field</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isEditor && (
        showFieldForm
          ? <FieldForm orgId={orgId} onDone={() => setShowFieldForm(false)} />
          : <div className="flex justify-end"><button className="btn-primary" onClick={() => setShowFieldForm(true)}>Add field</button></div>
      )}

      {fields.map((f) => {
        const detail = details[f.id];
        const expanded = expandedId === f.id;
        return (
          <div key={f.id} className="card overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-stone-50"
              onClick={() => toggleExpand(f.id)}
            >
              <div>
                <div className="font-semibold text-stone-800 flex items-center gap-2">
                  {f.name}
                  {f.is_high_tunnel && <span className="badge bg-blue-100 text-blue-700">High tunnel</span>}
                </div>
                <div className="text-xs text-stone-400 mt-0.5">
                  {f.field_rows.length > 0 ? `${f.field_rows.length} rows/beds` : "Tracked as whole field"}
                  {" · "}{f.plantings.length} planting{f.plantings.length === 1 ? "" : "s"}
                  {" · "}{f.soil_tests.length} soil test{f.soil_tests.length === 1 ? "" : "s"}
                </div>
              </div>
              <span className="text-stone-400 text-sm">{expanded ? "Hide" : "View"}</span>
            </button>

            {expanded && (
              <div className="border-t border-stone-100 px-5 py-4 space-y-5">
                {/* Plantings */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-stone-700">Plantings</h3>
                    {isEditor && (
                      <button className="text-xs font-medium text-brand-700 hover:underline" onClick={() => setActiveForm({ fieldId: f.id, kind: "planting" })}>
                        + Add planting
                      </button>
                    )}
                  </div>
                  {activeForm?.fieldId === f.id && activeForm.kind === "planting" && (
                    <PlantingForm orgId={orgId} fieldId={f.id} rows={f.field_rows} crops={crops} onDone={() => refreshDetail(f.id)} />
                  )}
                  {!detail ? (
                    <p className="text-xs text-stone-400">Loading…</p>
                  ) : detail.plantings.length === 0 ? (
                    <p className="text-xs text-stone-400">No plantings logged yet.</p>
                  ) : (
                    <div className="divide-y divide-stone-100">
                      {detail.plantings.map((p) => (
                        <div key={p.id} className="flex items-center justify-between py-2 text-sm">
                          <div>
                            <span className="font-medium text-stone-700">{p.crop_name_snapshot}</span>
                            {p.crop_family_snapshot && <span className="text-stone-400"> · {p.crop_family_snapshot}</span>}
                            <span className="text-stone-400"> · planted {p.planted_date}</span>
                          </div>
                          <StatusBadge status={p.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Soil tests */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-stone-700">Soil tests</h3>
                    {isEditor && (
                      <button className="text-xs font-medium text-brand-700 hover:underline" onClick={() => setActiveForm({ fieldId: f.id, kind: "soil" })}>
                        + Add soil test
                      </button>
                    )}
                  </div>
                  {activeForm?.fieldId === f.id && activeForm.kind === "soil" && (
                    <SoilTestForm orgId={orgId} fieldId={f.id} onDone={() => refreshDetail(f.id)} />
                  )}
                  {!detail ? (
                    <p className="text-xs text-stone-400">Loading…</p>
                  ) : detail.soilTests.length === 0 ? (
                    <p className="text-xs text-stone-400">No soil tests logged yet.</p>
                  ) : (
                    <div className="divide-y divide-stone-100">
                      {detail.soilTests.map((s) => (
                        <div key={s.id} className="py-2 text-sm text-stone-600">
                          {s.test_date} — pH {s.ph ?? "—"}, N {s.nitrogen_ppm ?? "—"}, P {s.phosphorus_ppm ?? "—"}, K{" "}
                          {s.potassium_ppm ?? "—"}, OM {s.organic_matter_pct ?? "—"}%
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Nutrient log */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-stone-700">Nutrient log</h3>
                    {isEditor && (
                      <button className="text-xs font-medium text-brand-700 hover:underline" onClick={() => setActiveForm({ fieldId: f.id, kind: "nutrient" })}>
                        + Add application
                      </button>
                    )}
                  </div>
                  {activeForm?.fieldId === f.id && activeForm.kind === "nutrient" && (
                    <div className="mt-2 p-3 rounded-lg border border-stone-200 bg-stone-50 space-y-2">
                      <div className="grid sm:grid-cols-3 gap-2">
                        <div>
                          <label className="label !text-[11px]">Date</label>
                          <input className="input !py-1.5 text-sm" type="date" value={nutrientDate} onChange={(e) => setNutrientDate(e.target.value)} />
                        </div>
                        <div>
                          <label className="label !text-[11px]">Product</label>
                          <input className="input !py-1.5 text-sm" value={nutrientProduct} onChange={(e) => setNutrientProduct(e.target.value)} placeholder="Composted manure" />
                        </div>
                        <div>
                          <label className="label !text-[11px]">Rate (optional)</label>
                          <input className="input !py-1.5 text-sm" value={nutrientRate} onChange={(e) => setNutrientRate(e.target.value)} placeholder="2 tons/acre" />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button type="button" className="btn-secondary !py-1 !px-2 text-xs" onClick={() => setActiveForm(null)}>Cancel</button>
                        <button
                          type="button"
                          className="btn-primary !py-1 !px-2 text-xs"
                          disabled={savingNutrient || !nutrientProduct.trim()}
                          onClick={() => saveNutrient(f.id)}
                        >
                          {savingNutrient ? "Saving…" : "Save"}
                        </button>
                      </div>
                    </div>
                  )}
                  {!detail ? (
                    <p className="text-xs text-stone-400">Loading…</p>
                  ) : detail.nutrients.length === 0 ? (
                    <p className="text-xs text-stone-400">No applications logged yet.</p>
                  ) : (
                    <div className="divide-y divide-stone-100">
                      {detail.nutrients.map((n) => (
                        <div key={n.id} className="py-2 text-sm text-stone-600">
                          {n.applied_date} — {n.product_name}{n.application_rate ? ` (${n.application_rate})` : ""}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
