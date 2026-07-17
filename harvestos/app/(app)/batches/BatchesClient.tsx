"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";
import { StatusBadge, EmptyState } from "@/components/ui";
import BatchForm from "@/components/forms/BatchForm";

const STATUSES = ["planted", "growing", "harvested", "sold_out", "composted"];

export default function BatchesClient({ orgId, batches, crops }: { orgId: string; batches: any[]; crops: any[] }) {
  const [showForm, setShowForm] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  async function updateStatus(id: string, status: string) {
    if (DEMO_MODE) return;
    await supabase.from("batches").update({ status, harvest_date: status === "harvested" ? new Date().toISOString().slice(0, 10) : undefined }).eq("id", id);
    router.refresh();
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        {!showForm && <button className="btn-primary" onClick={() => setShowForm(true)}>+ Add batch</button>}
      </div>
      {showForm && <BatchForm orgId={orgId} crops={crops} onDone={() => setShowForm(false)} />}

      {batches.length === 0 ? (
        <EmptyState title="No batches yet" hint="Log your first planting to start tracking cycles, costs, and yield." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-xs text-stone-500 uppercase tracking-wide">
              <tr>
                <th className="text-left py-3 px-4">Batch ID</th>
                <th className="text-left py-3 px-4">Crop</th>
                <th className="text-left py-3 px-4">Trays</th>
                <th className="text-left py-3 px-4">Planted</th>
                <th className="text-left py-3 px-4">Harvested</th>
                <th className="text-left py-3 px-4">Rack</th>
                <th className="text-left py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {batches.map((b) => (
                <tr key={b.id}>
                  <td className="py-2.5 px-4 font-mono text-xs text-stone-500">{b.batch_id}</td>
                  <td className="py-2.5 px-4 font-medium text-stone-700">{b.crop_name_snapshot}</td>
                  <td className="py-2.5 px-4">{b.tray_amount}</td>
                  <td className="py-2.5 px-4 text-stone-500">{b.plant_date}</td>
                  <td className="py-2.5 px-4 text-stone-500">{b.harvest_date ?? "—"}</td>
                  <td className="py-2.5 px-4 text-stone-500">{b.rack_location ?? "—"}</td>
                  <td className="py-2.5 px-4">
                    <select
                      className="text-xs border-0 bg-transparent font-medium focus:outline-none focus:ring-1 focus:ring-brand-500 rounded cursor-pointer"
                      value={b.status}
                      onChange={(e) => updateStatus(b.id, e.target.value)}
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                    </select>
                    <span className="ml-2"><StatusBadge status={b.status} /></span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
