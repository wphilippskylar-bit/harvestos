"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/ui";

type Animal = {
  id: string;
  ear_tag_number: string;
  breed: string | null;
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
  animals: { ear_tag_number: string } | null;
};

type GrazingEvent = {
  id: string;
  start_date: string;
  end_date: string | null;
  animal_notes: string | null;
  notes: string | null;
  fields: { name: string } | null;
  field_rows: { label: string } | null;
};

function escapeCsv(v: string) {
  return `"${String(v).replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, header: string[], rows: string[][]) {
  const lines = [header.join(","), ...rows.map((r) => r.map(escapeCsv).join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function ComplianceClient({
  orgName, animals, healthLogs, grazingEvents, startDate, endDate,
}: {
  orgName: string;
  animals: Animal[];
  healthLogs: HealthLog[];
  grazingEvents: GrazingEvent[];
  startDate: string;
  endDate: string;
}) {
  const router = useRouter();
  const [start, setStart] = useState(startDate);
  const [end, setEnd] = useState(endDate);

  function applyRange() {
    router.push(`/compliance?start=${start}&end=${end}`);
  }

  function exportHealthLogsCsv() {
    downloadCsv(
      `compliance-treatments-${startDate}-to-${endDate}.csv`,
      ["Date", "Animal", "Treatment type", "Treatment name", "Withdrawal end date", "Notes"],
      healthLogs.map((h) => [
        h.log_date,
        h.animals?.ear_tag_number ?? "",
        h.treatment_type,
        h.treatment_name ?? "",
        h.withdrawal_end_date ?? "",
        h.notes ?? "",
      ])
    );
  }

  function exportGrazingCsv() {
    downloadCsv(
      `compliance-grazing-${startDate}-to-${endDate}.csv`,
      ["Field", "Row", "Start date", "End date", "Notes"],
      grazingEvents.map((g) => [
        g.fields?.name ?? "",
        g.field_rows?.label ?? "",
        g.start_date,
        g.end_date ?? "ongoing",
        [g.animal_notes, g.notes].filter(Boolean).join(" — "),
      ])
    );
  }

  const restrictedAnimals = animals.filter((a) => a.restricted);

  return (
    <div className="space-y-6">
      {/* Controls — hidden when printed */}
      <div className="card p-5 print:hidden">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label">Report start</label>
            <input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <label className="label">Report end</label>
            <input className="input" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <button className="btn-secondary" onClick={applyRange}>Apply range</button>
          <div className="flex-1" />
          <button className="btn-secondary" onClick={exportHealthLogsCsv} disabled={healthLogs.length === 0}>
            Export treatments CSV
          </button>
          <button className="btn-secondary" onClick={exportGrazingCsv} disabled={grazingEvents.length === 0}>
            Export grazing CSV
          </button>
          <button className="btn-primary" onClick={() => window.print()}>Print / Save as PDF</button>
        </div>
      </div>

      {/* Report header — visible in print */}
      <div className="hidden print:block">
        <h1 className="text-xl font-bold text-stone-900">{orgName || "Farm"} — Compliance & Audit Trail</h1>
        <p className="text-sm text-stone-500">
          Report period: {startDate} to {endDate} · Generated {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* Herd biosecurity status */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-800">Current herd biosecurity status</h3>
          <p className="text-xs text-stone-400 mt-0.5">
            All animals on record, with any active withdrawal/movement restrictions flagged.
            {restrictedAnimals.length > 0 && (
              <span className="text-red-600 font-medium"> {restrictedAnimals.length} currently restricted.</span>
            )}
          </p>
        </div>
        {animals.length === 0 ? (
          <div className="px-5 py-4"><EmptyState title="No animals on record" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-xs text-stone-500 uppercase tracking-wide">
              <tr>
                <th className="text-left py-3 px-4">Ear tag</th>
                <th className="text-left py-3 px-4">Breed</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Restriction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {animals.map((a) => (
                <tr key={a.id}>
                  <td className="py-2.5 px-4 font-medium text-stone-700">{a.ear_tag_number}</td>
                  <td className="py-2.5 px-4 text-stone-500">{a.breed ?? "—"}</td>
                  <td className="py-2.5 px-4 text-stone-500 capitalize">{a.status}</td>
                  <td className="py-2.5 px-4">
                    {a.restricted ? (
                      <span className="badge bg-red-100 text-red-700">
                        Restricted{a.restricted_until ? ` until ${a.restricted_until}` : ""}
                      </span>
                    ) : (
                      <span className="badge bg-emerald-100 text-emerald-700">Clear</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Treatment / health log audit trail */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-800">Treatment audit trail</h3>
          <p className="text-xs text-stone-400 mt-0.5">Every logged treatment in the report period, with withdrawal end dates.</p>
        </div>
        {healthLogs.length === 0 ? (
          <div className="px-5 py-4"><EmptyState title="No treatments logged in this period" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-xs text-stone-500 uppercase tracking-wide">
              <tr>
                <th className="text-left py-3 px-4">Date</th>
                <th className="text-left py-3 px-4">Animal</th>
                <th className="text-left py-3 px-4">Treatment</th>
                <th className="text-left py-3 px-4">Withdrawal end</th>
                <th className="text-left py-3 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {healthLogs.map((h) => (
                <tr key={h.id}>
                  <td className="py-2.5 px-4 text-stone-500">{h.log_date}</td>
                  <td className="py-2.5 px-4 font-medium text-stone-700">{h.animals?.ear_tag_number ?? "—"}</td>
                  <td className="py-2.5 px-4 text-stone-600 capitalize">
                    {h.treatment_type}{h.treatment_name ? `: ${h.treatment_name}` : ""}
                  </td>
                  <td className="py-2.5 px-4 text-stone-500">
                    {h.withdrawal_end_date ? <span className="text-amber-600">{h.withdrawal_end_date}</span> : "—"}
                  </td>
                  <td className="py-2.5 px-4 text-stone-400">{h.notes ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Grazing / pasture movement log */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-800">Pasture movement log</h3>
          <p className="text-xs text-stone-400 mt-0.5">Where the herd's been, for biosecurity and rotation traceability.</p>
        </div>
        {grazingEvents.length === 0 ? (
          <div className="px-5 py-4"><EmptyState title="No grazing events logged in this period" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-xs text-stone-500 uppercase tracking-wide">
              <tr>
                <th className="text-left py-3 px-4">Field</th>
                <th className="text-left py-3 px-4">Start</th>
                <th className="text-left py-3 px-4">End</th>
                <th className="text-left py-3 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {grazingEvents.map((g) => (
                <tr key={g.id}>
                  <td className="py-2.5 px-4 font-medium text-stone-700">
                    {g.fields?.name ?? "Unknown field"}{g.field_rows?.label ? ` · ${g.field_rows.label}` : ""}
                  </td>
                  <td className="py-2.5 px-4 text-stone-500">{g.start_date}</td>
                  <td className="py-2.5 px-4 text-stone-500">{g.end_date ?? "ongoing"}</td>
                  <td className="py-2.5 px-4 text-stone-400">{[g.animal_notes, g.notes].filter(Boolean).join(" — ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
