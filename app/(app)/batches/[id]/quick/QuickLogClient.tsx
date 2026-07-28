"use client";

import { useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui";
import EnvLogForm from "@/components/forms/EnvLogForm";

export default function QuickLogClient({
  orgId, batch, logs,
}: { orgId: string; batch: any; logs: any[] }) {
  const [showForm, setShowForm] = useState(true); // scanning a tag means "I'm here to log something" — skip the extra tap

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div>
        <Link href="/batches" className="text-xs text-stone-400 hover:underline">&larr; All batches</Link>
        <div className="flex items-center justify-between mt-1">
          <h1 className="text-xl font-bold text-stone-800">{batch.batch_id}</h1>
          <StatusBadge status={batch.status} />
        </div>
        <p className="text-sm text-stone-500">
          {batch.crop_name_snapshot} &middot; {batch.tray_amount} tray{batch.tray_amount === 1 ? "" : "s"}
          {batch.rack_location ? ` · ${batch.rack_location}` : ""}
        </p>
      </div>

      {showForm ? (
        <EnvLogForm orgId={orgId} batchId={batch.id} onDone={() => setShowForm(false)} />
      ) : (
        <button className="btn-primary w-full" onClick={() => setShowForm(true)}>
          + Log another reading
        </button>
      )}

      <div>
        <h2 className="text-sm font-semibold text-stone-600 mb-2">Recent readings for this batch</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-stone-400">No readings logged for this batch yet.</p>
        ) : (
          <div className="card divide-y divide-stone-100">
            {logs.map((l) => (
              <div key={l.id} className="p-3 text-sm">
                <div className="flex justify-between text-stone-700 font-medium">
                  <span>{l.log_date}</span>
                  <span className="text-stone-400 font-normal">
                    {l.temperature_f != null ? `${l.temperature_f}°F` : ""}
                    {l.humidity_pct != null ? ` · ${l.humidity_pct}%` : ""}
                  </span>
                </div>
                {l.notes && <p className="text-stone-500 mt-1">{l.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
