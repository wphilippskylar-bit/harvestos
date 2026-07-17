"use client";

import { useState } from "react";
import { EmptyState } from "@/components/ui";
import EnvLogForm from "@/components/forms/EnvLogForm";

export default function EnvClient({ orgId, logs }: { orgId: string; logs: any[] }) {
  const [showForm, setShowForm] = useState(false);
  return (
    <div>
      <div className="flex justify-end mb-4">
        {!showForm && <button className="btn-primary" onClick={() => setShowForm(true)}>+ Add reading</button>}
      </div>
      {showForm && <EnvLogForm orgId={orgId} onDone={() => setShowForm(false)} />}
      {logs.length === 0 ? (
        <EmptyState title="No environmental readings yet" hint="Log temp, humidity, and VPD to spot problems before they cost you a batch." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-xs text-stone-500 uppercase tracking-wide">
              <tr>
                <th className="text-left py-3 px-4">Date</th>
                <th className="text-left py-3 px-4">Temp (°F)</th>
                <th className="text-left py-3 px-4">Humidity (%)</th>
                <th className="text-left py-3 px-4">VPD (kPa)</th>
                <th className="text-left py-3 px-4">Light (hrs)</th>
                <th className="text-left py-3 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="py-2.5 px-4 text-stone-500">{l.log_date}</td>
                  <td className="py-2.5 px-4">{l.temperature_f ?? "—"}</td>
                  <td className="py-2.5 px-4">{l.humidity_pct ?? "—"}</td>
                  <td className="py-2.5 px-4">{l.vpd_kpa ?? "—"}</td>
                  <td className="py-2.5 px-4">{l.light_schedule_hours ?? "—"}</td>
                  <td className="py-2.5 px-4 text-stone-500">{l.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
