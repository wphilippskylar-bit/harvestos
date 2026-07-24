"use client";

import { useEffect, useState } from "react";

type Field = { id: string; name: string; map_lat: number | null; map_lng: number | null };
type Period = { name: string; isDaytime: boolean; temperature: number; temperatureUnit: string; shortForecast: string };
type FieldRisk = { field: Field; lowestNightTemp: number | null; period: Period | null };

const FROST_THRESHOLD_F = 36; // NOAA/Extension guidance treats low-to-mid 30s as frost risk, 32 and below as a hard freeze

export default function FrostAlertBanner({ fields }: { fields: Field[] }) {
  const [risks, setRisks] = useState<FieldRisk[] | null>(null);
  const [loading, setLoading] = useState(true);

  const mappedFields = fields.filter((f) => f.map_lat != null && f.map_lng != null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (mappedFields.length === 0) { setLoading(false); return; }
      // Cap how many fields we hit NOAA for at once — most farms have a handful of distinct
      // locations anyway, and this keeps the page from firing off dozens of requests.
      const targets = mappedFields.slice(0, 8);
      const results = await Promise.all(
        targets.map(async (f) => {
          try {
            const res = await fetch(`/api/weather/forecast?lat=${f.map_lat}&lng=${f.map_lng}`);
            if (!res.ok) return { field: f, lowestNightTemp: null, period: null } as FieldRisk;
            const data = await res.json();
            const periods: Period[] = data.periods ?? [];
            // Look at the next ~3 days (6 periods, day+night alternating) for the coldest
            // nighttime reading — that's what actually threatens tender crops.
            const nightPeriods = periods.slice(0, 6).filter((p) => !p.isDaytime);
            const coldest = nightPeriods.reduce<Period | null>((min, p) => (!min || p.temperature < min.temperature ? p : min), null);
            return { field: f, lowestNightTemp: coldest?.temperature ?? null, period: coldest } as FieldRisk;
          } catch {
            return { field: f, lowestNightTemp: null, period: null } as FieldRisk;
          }
        })
      );
      if (!cancelled) { setRisks(results); setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
    // Re-fetch when the set of fields OR any field's pinned location changes — keying on IDs
    // alone missed the case where an existing field gets re-pinned to a new spot on the map, which
    // would silently keep showing forecasts for the old location.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields.map((f) => `${f.id}:${f.map_lat}:${f.map_lng}`).join(",")]);

  if (mappedFields.length === 0 || loading) return null;

  const atRisk = (risks ?? []).filter((r) => r.lowestNightTemp != null && r.lowestNightTemp <= FROST_THRESHOLD_F);
  if (atRisk.length === 0) return null;

  return (
    <div className="card p-4 mb-6 border-l-4 border-sky-400 bg-sky-50/50">
      <div className="font-semibold text-sky-800 text-sm">Frost/freeze risk in the next 3 nights</div>
      <div className="mt-1 space-y-0.5">
        {atRisk.map((r) => (
          <p key={r.field.id} className="text-sm text-sky-700">
            <span className="font-medium">{r.field.name}</span>
            {" — "}
            {r.lowestNightTemp}°{r.period?.temperatureUnit ?? "F"} ({r.period?.name})
            {r.lowestNightTemp !== null && r.lowestNightTemp <= 32 ? " — hard freeze" : " — frost risk"}
          </p>
        ))}
      </div>
      <p className="text-xs text-sky-600 mt-1.5">From NOAA's public forecast — based on each field's pinned map location.</p>
    </div>
  );
}
