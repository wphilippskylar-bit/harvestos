"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";
import { EmptyState } from "@/components/ui";
import AnimalForm from "@/components/forms/AnimalForm";
import HealthLogForm from "@/components/forms/HealthLogForm";
import GrazingForm from "@/components/forms/GrazingForm";

type Animal = {
  id: string;
  ear_tag_number: string;
  breed: string | null;
  birth_date: string | null;
  status: string;
  restricted: boolean;
  restricted_until: string | null;
};

type HealthLog = {
  id: string;
  log_date: string;
  treatment_type: string;
  treatment_name: string | null;
  notes: string | null;
  withdrawal_days: number | null;
  withdrawal_end_date: string | null;
};

type FieldRow = { id: string; label: string };
type Field = { id: string; name: string; field_rows: FieldRow[] };
type GrazingEvent = {
  id: string;
  field_id: string;
  row_id: string | null;
  start_date: string;
  end_date: string | null;
  animal_notes: string | null;
};

export default function LivestockClient({
  orgId, role, animals, fields, grazingEvents,
}: {
  orgId: string;
  role: string;
  animals: Animal[];
  fields?: Field[];
  grazingEvents?: GrazingEvent[];
}) {
  const supabase = createClient();
  const isEditor = role === "owner" || role === "admin" || role === "member";
  const [showAnimalForm, setShowAnimalForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [logs, setLogs] = useState<Record<string, HealthLog[]>>({});
  const [showLogForm, setShowLogForm] = useState<string | null>(null);
  const [showGrazingForm, setShowGrazingForm] = useState(false);

  async function loadLogs(animalId: string) {
    if (DEMO_MODE) { setLogs((l) => ({ ...l, [animalId]: [] })); return; }
    const { data } = await supabase
      .from("animal_health_logs")
      .select("*")
      .eq("animal_id", animalId)
      .order("log_date", { ascending: false });
    setLogs((l) => ({ ...l, [animalId]: data ?? [] }));
  }

  function toggleExpand(animalId: string) {
    if (expandedId === animalId) { setExpandedId(null); return; }
    setExpandedId(animalId);
    setShowLogForm(null);
    if (!logs[animalId]) loadLogs(animalId);
  }

  function refreshLogs(animalId: string) {
    setShowLogForm(null);
    loadLogs(animalId);
  }

  const fieldName = (id: string) => fields?.find((f) => f.id === id)?.name ?? "Unknown field";
  const rowLabel = (fieldId: string, rowId: string | null) =>
    rowId ? fields?.find((f) => f.id === fieldId)?.field_rows.find((r) => r.id === rowId)?.label ?? null : null;

  const grazingSection = (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-stone-800">Grazing / pasture rotation</h3>
          <p className="text-xs text-stone-400 mt-0.5">
            Log which pasture the herd's on so Harvest OS can warn you before regrazing too soon.
          </p>
        </div>
        {isEditor && !showGrazingForm && (
          <button className="btn-primary !py-1.5 !px-3 text-xs" onClick={() => setShowGrazingForm(true)}>
            + Log move
          </button>
        )}
      </div>
      {showGrazingForm && (
        <div className="px-5 pt-3">
          <GrazingForm orgId={orgId} fields={fields ?? []} onDone={() => setShowGrazingForm(false)} />
        </div>
      )}
      <div className="px-5 py-3">
        {!grazingEvents || grazingEvents.length === 0 ? (
          <p className="text-xs text-stone-400">No grazing history logged yet.</p>
        ) : (
          <div className="divide-y divide-stone-100">
            {grazingEvents.map((g) => (
              <div key={g.id} className="py-2 text-sm text-stone-600">
                <span className="font-medium text-stone-700">{fieldName(g.field_id)}</span>
                {rowLabel(g.field_id, g.row_id) && <span> · {rowLabel(g.field_id, g.row_id)}</span>}
                {" — "}
                {g.start_date}
                {g.end_date ? ` to ${g.end_date}` : " (ongoing)"}
                {g.animal_notes && <div className="text-xs text-stone-400 mt-0.5">{g.animal_notes}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (animals.length === 0 && !showAnimalForm) {
    return (
      <div className="space-y-4">
        <EmptyState
          title="No animals yet"
          hint="Add an animal to start tracking health treatments and withdrawal periods."
        />
        {isEditor && (
          <div className="flex justify-center">
            <button className="btn-primary" onClick={() => setShowAnimalForm(true)}>Add your first animal</button>
          </div>
        )}
        {grazingSection}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isEditor && (
        showAnimalForm
          ? <AnimalForm orgId={orgId} animals={animals} onDone={() => setShowAnimalForm(false)} />
          : <div className="flex justify-end"><button className="btn-primary" onClick={() => setShowAnimalForm(true)}>Add animal</button></div>
      )}

      {animals.map((a) => {
        const expanded = expandedId === a.id;
        const entries = logs[a.id];
        return (
          <div key={a.id} className="card overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-stone-50"
              onClick={() => toggleExpand(a.id)}
            >
              <div>
                <div className="font-semibold text-stone-800 flex items-center gap-2">
                  {a.ear_tag_number}
                  {a.breed && <span className="text-stone-400 font-normal text-sm">· {a.breed}</span>}
                  {a.restricted ? (
                    <span className="badge bg-red-100 text-red-700">
                      Restricted{a.restricted_until ? ` until ${a.restricted_until}` : ""}
                    </span>
                  ) : (
                    <span className="badge bg-emerald-100 text-emerald-700">Clear</span>
                  )}
                </div>
                <div className="text-xs text-stone-400 mt-0.5">
                  {a.birth_date ? `Born ${a.birth_date}` : "Birth date not set"}
                  {a.status !== "active" && ` · ${a.status}`}
                </div>
              </div>
              <span className="text-stone-400 text-sm">{expanded ? "Hide" : "View"}</span>
            </button>

            {expanded && (
              <div className="border-t border-stone-100 px-5 py-4 space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-stone-700">Health log</h3>
                  {isEditor && (
                    <button
                      className="text-xs font-medium text-brand-700 hover:underline"
                      onClick={() => setShowLogForm(showLogForm === a.id ? null : a.id)}
                    >
                      + Add entry
                    </button>
                  )}
                </div>
                {showLogForm === a.id && (
                  <HealthLogForm orgId={orgId} animalId={a.id} onDone={() => refreshLogs(a.id)} />
                )}
                {!entries ? (
                  <p className="text-xs text-stone-400">Loading…</p>
                ) : entries.length === 0 ? (
                  <p className="text-xs text-stone-400">No health log entries yet.</p>
                ) : (
                  <div className="divide-y divide-stone-100">
                    {entries.map((h) => (
                      <div key={h.id} className="py-2 text-sm text-stone-600">
                        <span className="font-medium text-stone-700">{h.log_date}</span>
                        {" — "}
                        <span className="capitalize">{h.treatment_type}</span>
                        {h.treatment_name && <span>: {h.treatment_name}</span>}
                        {h.withdrawal_end_date && (
                          <span className="text-amber-600"> (withdrawal until {h.withdrawal_end_date})</span>
                        )}
                        {h.notes && <div className="text-xs text-stone-400 mt-0.5">{h.notes}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {grazingSection}
    </div>
  );
}
