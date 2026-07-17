"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";
import { EmptyState, StatusBadge } from "@/components/ui";
import GoalForm from "@/components/forms/GoalForm";

export default function GoalsClient({ orgId, goals }: { orgId: string; goals: any[] }) {
  const [showForm, setShowForm] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const supabase = createClient();
  const router = useRouter();

  async function updateProgress(id: string, target: number) {
    const val = Number(drafts[id]);
    if (Number.isNaN(val)) return;
    const status = val >= target ? "hit" : "active";
    if (DEMO_MODE) return;
    await supabase.from("goals").update({ current_value: val, status }).eq("id", id);
    router.refresh();
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        {!showForm && <button className="btn-primary" onClick={() => setShowForm(true)}>+ Set a goal</button>}
      </div>
      {showForm && <GoalForm orgId={orgId} onDone={() => setShowForm(false)} />}

      {goals.length === 0 ? (
        <EmptyState title="No goals set yet" hint="Set a target — trays/week, accounts landed, take-home per month — and track your progress toward it." />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {goals.map((g) => {
            const pct = g.target_value ? Math.min(100, (g.current_value / g.target_value) * 100) : 0;
            return (
              <div key={g.id} className="card p-5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-stone-800">{g.title}</h3>
                  <StatusBadge status={g.status} />
                </div>
                {g.target_date && <p className="text-xs text-stone-400 mb-3">Target date: {g.target_date}</p>}
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium text-stone-700">{g.current_value} / {g.target_value}</span>
                  <span className="text-stone-400">{Math.round(pct)}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-stone-100 overflow-hidden mb-4">
                  <div className={`h-full rounded-full ${pct >= 100 ? "bg-emerald-500" : "bg-brand-600"}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="flex gap-2">
                  <input
                    className="input flex-1"
                    type="number"
                    step="0.01"
                    placeholder="Update current value"
                    defaultValue={g.current_value}
                    onChange={(e) => setDrafts((d) => ({ ...d, [g.id]: e.target.value }))}
                  />
                  <button className="btn-secondary whitespace-nowrap" onClick={() => updateProgress(g.id, g.target_value)}>Update</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
