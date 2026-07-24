"use client";

import { useState } from "react";
import { EmptyState, fmtCurrency2 } from "@/components/ui";
import LaborForm from "@/components/forms/LaborForm";

export default function LaborClient({
  orgId, entries, fields, animals, batches,
}: { orgId: string; entries: any[]; fields: any[]; animals: any[]; batches: any[] }) {
  const [showForm, setShowForm] = useState(false);
  const total = entries.reduce((a, e) => a + (e.cost ?? 0), 0);
  const fieldMap = Object.fromEntries(fields.map((f) => [f.id, f.name]));
  const animalMap = Object.fromEntries(animals.map((a) => [a.id, a.ear_tag_number]));
  const batchMap = Object.fromEntries(batches.map((b) => [b.id, b.batch_id]));

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-stone-500">Total labor cost: <span className="font-semibold text-stone-800">{fmtCurrency2(total)}</span></div>
        {!showForm && <button className="btn-primary" onClick={() => setShowForm(true)}>+ Log labor</button>}
      </div>
      {showForm && (
        <LaborForm orgId={orgId} fields={fields} animals={animals} batches={batches} onDone={() => setShowForm(false)} />
      )}

      {entries.length === 0 ? (
        <EmptyState title="No labor logged yet" hint="Log hours here to see real labor cost feed into Profitability and break-even." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-xs text-stone-500 uppercase tracking-wide">
              <tr>
                <th className="text-left py-3 px-4">Date</th>
                <th className="text-left py-3 px-4">Worker</th>
                <th className="text-left py-3 px-4">Tied to</th>
                <th className="text-right py-3 px-4">Hours</th>
                <th className="text-right py-3 px-4">Rate</th>
                <th className="text-right py-3 px-4">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="py-2.5 px-4 text-stone-500">{e.work_date}</td>
                  <td className="py-2.5 px-4 font-medium text-stone-700">{e.worker_name ?? "—"}</td>
                  <td className="py-2.5 px-4 text-stone-500">
                    {fieldMap[e.field_id] ?? animalMap[e.animal_id] ?? batchMap[e.batch_id] ?? "—"}
                  </td>
                  <td className="py-2.5 px-4 text-right">{e.hours}</td>
                  <td className="py-2.5 px-4 text-right">{fmtCurrency2(e.hourly_rate)}</td>
                  <td className="py-2.5 px-4 text-right font-medium">{fmtCurrency2(e.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
