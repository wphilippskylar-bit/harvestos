"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";
import { EmptyState } from "@/components/ui";
import CeaAreaForm from "@/components/forms/CeaAreaForm";
import CeaFacilityForm from "@/components/forms/CeaFacilityForm";
import CeaPlantingForm from "@/components/forms/CeaPlantingForm";
import CeaEnvLogForm from "@/components/forms/CeaEnvLogForm";
import { areaUnitLabel, defaultAreaUnit, sqFtToPreferred } from "@/lib/units";
import OfflineDataBanner from "@/components/OfflineDataBanner";
import { useLiveCachedTable } from "@/lib/useLiveCachedTable";
import { useOnlineStatus } from "@/lib/useOnlineStatus";

type Planting = { id: string; status: string; crop_name_snapshot: string | null; planted_date: string; growing_medium?: string | null };
type Row = { id: string; label: string };
type Area = {
  id: string;
  name: string;
  area_type: string;
  facility_id?: string | null;
  sq_ft: number | null;
  notes: string | null;
  last_sterilized_date?: string | null;
  sterilization_notes?: string | null;
  cea_area_rows: Row[];
  cea_plantings: Planting[];
};
type Facility = { id: string; name: string; facility_type: string; notes: string | null };
type Crop = { id: string; name: string };
type EnvLog = {
  id: string;
  log_date: string;
  temperature_f: number | null;
  humidity_pct: number | null;
  co2_ppm: number | null;
  nutrient_ec: number | null;
  notes: string | null;
};

const AREA_TYPE_LABELS: Record<string, string> = {
  greenhouse: "Greenhouse",
  high_tunnel: "High tunnel (climate-controlled)",
  indoor_vertical: "Indoor vertical farm",
  hydroponic: "Hydroponic",
  other: "Other",
};

const FACILITY_TYPE_LABELS: Record<string, string> = {
  building: "Building",
  greenhouse_complex: "Greenhouse complex",
  warehouse: "Warehouse",
  other: "Other",
};

const GROWING_MEDIUM_LABELS: Record<string, string> = {
  hydroponic_mat: "Hydroponic mat",
  rockwool: "Rockwool",
  nft_channel: "NFT channel",
  coco_coir: "Coco coir",
  soil: "Soil",
  perlite_vermiculite: "Perlite / vermiculite",
  other: "Other medium",
};

function daysSince(dateStr: string): number {
  const then = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
}

export default function CeaClient({
  orgId, role, areas: serverAreas, crops: serverCrops = [], facilities: serverFacilities = [], weightUnit, areaUnit,
}: {
  orgId: string;
  role: string;
  areas: Area[];
  crops?: Crop[];
  facilities?: Facility[];
  weightUnit?: string;
  areaUnit?: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const isEditor = role === "owner" || role === "admin" || role === "member";
  // Phase 5 of the local-first rewrite (see HarvestOS_Local_First_Rewrite_Plan.md).
  const areas = useLiveCachedTable<Area>("cea_areas", orgId, serverAreas);
  const facilities = useLiveCachedTable<Facility>("cea_facilities", orgId, serverFacilities);
  // crops here is just "crops" filtered to the ones applicable to CEA growing — the shared
  // "crops" table is already cached/live (Phases 2/3), so this reads that directly instead of
  // needing its own separate table, same filter lib/data.ts's getCeaCrops applies server-side.
  const allCrops = useLiveCachedTable<any>("crops", orgId, undefined);
  const crops = (allCrops.length > 0 ? allCrops : serverCrops).filter(
    (c: any) => !c.applicable_to || c.applicable_to.includes("cea")
  );
  const isOffline = useOnlineStatus();
  const [showAreaForm, setShowAreaForm] = useState(false);
  const [showFacilityForm, setShowFacilityForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showPlantingForm, setShowPlantingForm] = useState<string | null>(null);
  const [showLogForm, setShowLogForm] = useState<string | null>(null);
  const [envLogs, setEnvLogs] = useState<Record<string, EnvLog[]>>({});

  async function deleteArea(id: string, name: string) {
    if (DEMO_MODE) return;
    if (!window.confirm(`Delete "${name}"? This can't be undone — its plantings and environment log will be deleted too.`)) return;
    await supabase.from("cea_areas").delete().eq("id", id);
    router.refresh();
  }

  async function loadEnvLogs(areaId: string) {
    if (DEMO_MODE) { setEnvLogs((l) => ({ ...l, [areaId]: [] })); return; }
    const { data } = await supabase
      .from("cea_environment_logs")
      .select("*")
      .eq("area_id", areaId)
      .order("log_date", { ascending: false });
    setEnvLogs((l) => ({ ...l, [areaId]: data ?? [] }));
  }

  function toggleExpand(areaId: string) {
    if (expandedId === areaId) { setExpandedId(null); return; }
    setExpandedId(areaId);
    setShowPlantingForm(null);
    setShowLogForm(null);
    if (!envLogs[areaId]) loadEnvLogs(areaId);
  }

  if (areas.length === 0 && !showAreaForm) {
    return (
      <div className="space-y-4">
        <OfflineDataBanner usingCache={isOffline} cachedAt={null} />
        <EmptyState
          title="No greenhouse / indoor areas yet"
          hint="Add an area (greenhouse, high tunnel, indoor vertical, hydroponic…) to start tracking plantings and environment readings."
        />
        {isEditor && (
          <div className="flex justify-center">
            <button className="btn-primary" onClick={() => setShowAreaForm(true)}>Add your first area</button>
          </div>
        )}
      </div>
    );
  }

  // Group rooms under their facility, if any — a room with no facility_id just falls into the
  // "standalone" bucket at the end, so single-room growers see the exact same flat list as before.
  const facilityGroups = facilities.map((f) => ({
    facility: f,
    rooms: areas.filter((a) => a.facility_id === f.id),
  }));
  const standaloneRooms = areas.filter((a) => !a.facility_id || !facilities.some((f) => f.id === a.facility_id));

  function facilityStats(rooms: Area[]) {
    const activePlantings = rooms.reduce(
      (sum, r) => sum + (r.cea_plantings?.filter((p) => p.status !== "harvested" && p.status !== "failed").length ?? 0),
      0
    );
    return { roomCount: rooms.length, activePlantings };
  }

  function renderAreaCard(a: Area) {
        const expanded = expandedId === a.id;
        const logs = envLogs[a.id];
        const activePlantings = a.cea_plantings?.filter((p) => p.status !== "harvested" && p.status !== "failed") ?? [];
        const unit = defaultAreaUnit(areaUnit);
        const displaySize = a.sq_ft != null ? sqFtToPreferred(a.sq_ft, unit) : null;
        return (
          <div key={a.id} className="card overflow-hidden">
            <div className="w-full flex items-center justify-between px-5 py-4 hover:bg-stone-50">
              <button className="flex-1 text-left" onClick={() => toggleExpand(a.id)}>
                <div className="font-semibold text-stone-800 flex items-center gap-2">
                  {a.name}
                  <span className="badge bg-brand-700/10 text-brand-700">{AREA_TYPE_LABELS[a.area_type] ?? a.area_type}</span>
                </div>
                <div className="text-xs text-stone-400 mt-0.5">
                  {displaySize != null ? `${Math.round(displaySize * 100) / 100} ${areaUnitLabel(unit)} · ` : ""}
                  {activePlantings.length} active planting{activePlantings.length === 1 ? "" : "s"}
                </div>
              </button>
              <div className="flex items-center gap-3 shrink-0">
                {isEditor && (
                  <button
                    className="text-xs font-medium text-red-600 hover:underline"
                    onClick={() => deleteArea(a.id, a.name)}
                  >
                    Delete
                  </button>
                )}
                <button className="text-stone-400 text-sm" onClick={() => toggleExpand(a.id)}>
                  {expanded ? "Hide" : "View"}
                </button>
              </div>
            </div>

            {expanded && (
              <div className="border-t border-stone-100 px-5 py-4 space-y-5">
                {a.notes && <p className="text-xs text-stone-400">{a.notes}</p>}

                {(a.last_sterilized_date || a.sterilization_notes) && (
                  <div className="text-xs text-stone-500 flex items-center gap-1.5">
                    <span className="badge bg-stone-100 text-stone-600">
                      Last sterilized: {a.last_sterilized_date
                        ? `${a.last_sterilized_date} (${daysSince(a.last_sterilized_date)}d ago)`
                        : "not recorded"}
                    </span>
                    {a.sterilization_notes && <span className="text-stone-400">{a.sterilization_notes}</span>}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-stone-700">Plantings</h3>
                    {isEditor && (
                      <button
                        className="text-xs font-medium text-brand-700 hover:underline"
                        onClick={() => setShowPlantingForm(showPlantingForm === a.id ? null : a.id)}
                      >
                        + Add planting
                      </button>
                    )}
                  </div>
                  {showPlantingForm === a.id && (
                    <CeaPlantingForm
                      orgId={orgId}
                      areaId={a.id}
                      rows={a.cea_area_rows}
                      crops={crops}
                      weightUnit={weightUnit}
                      onDone={() => { setShowPlantingForm(null); router.refresh(); }}
                    />
                  )}
                  {!a.cea_plantings || a.cea_plantings.length === 0 ? (
                    <p className="text-xs text-stone-400">No plantings logged yet.</p>
                  ) : (
                    <div className="divide-y divide-stone-100">
                      {a.cea_plantings.map((p) => (
                        <div key={p.id} className="py-2 text-sm text-stone-600 flex items-center justify-between">
                          <span>
                            <span className="font-medium text-stone-700">{p.crop_name_snapshot ?? "Untitled"}</span>
                            {" — planted "}{p.planted_date}
                            {p.growing_medium && (
                              <span className="text-xs text-stone-400"> · {GROWING_MEDIUM_LABELS[p.growing_medium] ?? p.growing_medium}</span>
                            )}
                          </span>
                          <span className="badge bg-stone-100 text-stone-600 capitalize">{p.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-stone-700">Environment log</h3>
                    {isEditor && (
                      <button
                        className="text-xs font-medium text-brand-700 hover:underline"
                        onClick={() => setShowLogForm(showLogForm === a.id ? null : a.id)}
                      >
                        + Log reading
                      </button>
                    )}
                  </div>
                  {showLogForm === a.id && (
                    <CeaEnvLogForm
                      orgId={orgId}
                      areaId={a.id}
                      plantings={a.cea_plantings}
                      onDone={() => { setShowLogForm(null); loadEnvLogs(a.id); }}
                    />
                  )}
                  {!logs ? (
                    <p className="text-xs text-stone-400">Loading…</p>
                  ) : logs.length === 0 ? (
                    <p className="text-xs text-stone-400">No environment readings logged yet.</p>
                  ) : (
                    <div className="divide-y divide-stone-100">
                      {logs.map((l) => (
                        <div key={l.id} className="py-2 text-sm text-stone-600">
                          <span className="font-medium text-stone-700">{l.log_date}</span>
                          {l.temperature_f != null && <span> · {l.temperature_f}°F</span>}
                          {l.humidity_pct != null && <span> · {l.humidity_pct}% RH</span>}
                          {l.co2_ppm != null && <span> · {l.co2_ppm} ppm CO2</span>}
                          {l.nutrient_ec != null && <span> · EC {l.nutrient_ec}</span>}
                          {l.notes && <div className="text-xs text-stone-400 mt-0.5">{l.notes}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
  }

  return (
    <div className="space-y-6">
      <OfflineDataBanner usingCache={isOffline} cachedAt={null} />
      {isEditor && (
        <div className="flex justify-end gap-2">
          {facilities.length === 0 && !showFacilityForm && (
            <button className="btn-secondary" onClick={() => setShowFacilityForm(true)}>+ Add facility</button>
          )}
          {!showAreaForm && <button className="btn-primary" onClick={() => setShowAreaForm(true)}>+ Add room</button>}
        </div>
      )}
      {isEditor && showFacilityForm && (
        <CeaFacilityForm orgId={orgId} onDone={() => setShowFacilityForm(false)} />
      )}
      {isEditor && showAreaForm && (
        <CeaAreaForm orgId={orgId} areaUnit={areaUnit} facilities={facilities} onDone={() => setShowAreaForm(false)} />
      )}

      {facilityGroups.filter((g) => g.rooms.length > 0 || facilities.length > 0).map(({ facility, rooms }) => {
        const stats = facilityStats(rooms);
        return (
          <div key={facility.id} className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <h2 className="text-sm font-semibold text-stone-800">{facility.name}</h2>
              <span className="badge bg-stone-100 text-stone-600">{FACILITY_TYPE_LABELS[facility.facility_type] ?? facility.facility_type}</span>
              <span className="text-xs text-stone-400">
                {stats.roomCount} room{stats.roomCount === 1 ? "" : "s"} · {stats.activePlantings} active planting{stats.activePlantings === 1 ? "" : "s"}
              </span>
            </div>
            {rooms.length === 0 ? (
              <p className="text-xs text-stone-400 px-1">No rooms added to this facility yet — add a room and pick it from the facility dropdown.</p>
            ) : (
              <div className="space-y-3">{rooms.map(renderAreaCard)}</div>
            )}
          </div>
        );
      })}

      {standaloneRooms.length > 0 && (
        <div className="space-y-3">
          {facilities.length > 0 && <h2 className="text-sm font-semibold text-stone-800 px-1">Standalone rooms</h2>}
          <div className="space-y-3">{standaloneRooms.map(renderAreaCard)}</div>
        </div>
      )}
    </div>
  );
}
