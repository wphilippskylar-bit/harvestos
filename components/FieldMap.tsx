"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MapContainer, TileLayer, Marker, Polygon, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";
import { errorMessage } from "@/lib/errors";

// Default Leaflet marker icons reference image files that don't survive a Next.js/webpack bundle
// the way Leaflet expects — this re-points them at the CDN copies so pins actually render instead
// of showing broken-image icons.
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

type Field = {
  id: string;
  name: string;
  is_high_tunnel: boolean;
  acreage: number | null;
  map_lat: number | null;
  map_lng: number | null;
  boundary: [number, number][] | null;
};

const DEFAULT_CENTER: [number, number] = [35.4676, -97.5164]; // Oklahoma City — reasonable default given the farm's OSU Extension/Chickasaw Nation OK context
const COLORS = ["#15803d", "#b45309", "#1d4ed8", "#a21caf", "#0f766e", "#b91c1c"];

// Shoelace-formula planar area, adjusted for latitude, in acres — an approximation (ignores earth
// curvature) that's plenty accurate for field-sized polygons.
function polygonAcres(points: [number, number][]) {
  if (points.length < 3) return 0;
  const latRad = (points[0][0] * Math.PI) / 180;
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos(latRad);
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const [lat1, lng1] = points[i];
    const [lat2, lng2] = points[(i + 1) % points.length];
    const x1 = lng1 * metersPerDegLng, y1 = lat1 * metersPerDegLat;
    const x2 = lng2 * metersPerDegLng, y2 = lat2 * metersPerDegLat;
    area += x1 * y2 - x2 * y1;
  }
  const sqMeters = Math.abs(area) / 2;
  return sqMeters / 4046.86; // sq meters -> acres
}

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function FieldMap({ orgId, fields, isEditor }: { orgId: string; fields: Field[]; isEditor: boolean }) {
  const supabase = createClient();
  const router = useRouter();
  const [selectedFieldId, setSelectedFieldId] = useState<string>(fields[0]?.id ?? "");
  const [mode, setMode] = useState<"none" | "pin" | "boundary">("none");
  const [drawPoints, setDrawPoints] = useState<[number, number][]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fieldsWithLocation = fields.filter((f) => f.map_lat != null && f.map_lng != null);
  const fieldsWithBoundary = fields.filter((f) => f.boundary && f.boundary.length >= 3);

  const center: [number, number] = useMemo(() => {
    if (fieldsWithLocation.length > 0) return [fieldsWithLocation[0].map_lat!, fieldsWithLocation[0].map_lng!];
    if (fieldsWithBoundary.length > 0) return fieldsWithBoundary[0].boundary![0];
    return DEFAULT_CENTER;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function startPin() {
    setMode("pin");
    setError(null);
  }
  function startBoundary() {
    setMode("boundary");
    setDrawPoints([]);
    setError(null);
  }
  function cancelEdit() {
    setMode("none");
    setDrawPoints([]);
  }

  async function handleMapClick(lat: number, lng: number) {
    if (!isEditor || !selectedFieldId) return;
    if (mode === "pin") {
      await savePin(lat, lng);
    } else if (mode === "boundary") {
      setDrawPoints((pts) => [...pts, [lat, lng]]);
    }
  }

  async function savePin(lat: number, lng: number) {
    if (DEMO_MODE) { setMode("none"); return; }
    setSaving(true);
    setError(null);
    try {
      const { error: err } = await supabase.from("fields").update({ map_lat: lat, map_lng: lng }).eq("id", selectedFieldId);
      if (err) throw err;
      setMode("none");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, "Could not save location"));
    } finally {
      setSaving(false);
    }
  }

  async function finishBoundary() {
    if (drawPoints.length < 3) { setError("Add at least 3 points to draw a boundary."); return; }
    if (DEMO_MODE) { setMode("none"); setDrawPoints([]); return; }
    setSaving(true);
    setError(null);
    try {
      const { error: err } = await supabase.from("fields").update({ boundary: drawPoints }).eq("id", selectedFieldId);
      if (err) throw err;
      setMode("none");
      setDrawPoints([]);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, "Could not save boundary"));
    } finally {
      setSaving(false);
    }
  }

  async function clearBoundary(fieldId: string) {
    if (DEMO_MODE) return;
    await supabase.from("fields").update({ boundary: null }).eq("id", fieldId);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {isEditor && (
        <div className="card p-4 flex flex-wrap items-center gap-3">
          <select className="input !w-auto" value={selectedFieldId} onChange={(e) => setSelectedFieldId(e.target.value)}>
            {fields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          {mode === "none" && (
            <>
              <button className="btn-secondary !py-1.5 text-sm" onClick={startPin}>Set pin location</button>
              <button className="btn-secondary !py-1.5 text-sm" onClick={startBoundary}>Draw boundary</button>
            </>
          )}
          {mode === "pin" && (
            <>
              <span className="text-sm text-brand-700 font-medium">Click the map to place a pin for the selected field…</span>
              <button className="btn-secondary !py-1.5 text-sm" onClick={cancelEdit}>Cancel</button>
            </>
          )}
          {mode === "boundary" && (
            <>
              <span className="text-sm text-brand-700 font-medium">
                Click to add boundary points ({drawPoints.length} so far)…
              </span>
              <button className="btn-primary !py-1.5 text-sm" onClick={finishBoundary} disabled={saving || drawPoints.length < 3}>
                {saving ? "Saving…" : "Finish boundary"}
              </button>
              <button className="btn-secondary !py-1.5 text-sm" onClick={cancelEdit}>Cancel</button>
            </>
          )}
          {error && <p className="text-sm text-red-600 basis-full">{error}</p>}
        </div>
      )}

      <div className="card overflow-hidden" style={{ height: 500 }}>
        <MapContainer center={center} zoom={14} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {isEditor && mode !== "none" && <ClickHandler onClick={handleMapClick} />}

          {fieldsWithLocation.map((f, i) => (
            <Marker key={f.id} position={[f.map_lat!, f.map_lng!]} icon={defaultIcon} />
          ))}

          {fieldsWithBoundary.map((f, i) => (
            <Polygon
              key={f.id}
              positions={f.boundary!}
              pathOptions={{ color: COLORS[i % COLORS.length], fillOpacity: 0.25 }}
            />
          ))}

          {mode === "boundary" && drawPoints.length > 0 && (
            <Polygon positions={drawPoints} pathOptions={{ color: "#0369a1", dashArray: "4 4", fillOpacity: 0.15 }} />
          )}
        </MapContainer>
      </div>

      <div className="card divide-y divide-stone-100">
        {fields.map((f) => (
          <div key={f.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
            <div>
              <span className="font-medium text-stone-700">{f.name}</span>
              {f.is_high_tunnel && <span className="text-xs text-stone-400 ml-2">High tunnel</span>}
              {f.boundary && f.boundary.length >= 3 && (
                <span className="text-xs text-stone-400 ml-2">≈ {polygonAcres(f.boundary).toFixed(2)} acres drawn</span>
              )}
              {!f.map_lat && !f.boundary && <span className="text-xs text-stone-300 ml-2">Not placed on map yet</span>}
            </div>
            {isEditor && f.boundary && (
              <button className="text-xs text-red-600 hover:underline" onClick={() => clearBoundary(f.id)}>Clear boundary</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
