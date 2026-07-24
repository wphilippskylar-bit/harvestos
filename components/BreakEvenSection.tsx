"use client";

import { useMemo, useState } from "react";
import { fmtCurrency2 } from "@/components/ui";

type ScopeItem = { id: string; label: string; cost: number; revenue: number };

export default function BreakEvenSection({
  operation, fields, animals,
}: {
  operation: { cost: number; revenue: number };
  fields: ScopeItem[];
  animals: ScopeItem[];
}) {
  const [scope, setScope] = useState<"operation" | "field" | "animal">("operation");
  const [itemId, setItemId] = useState<string>(fields[0]?.id ?? "");

  const list = scope === "field" ? fields : scope === "animal" ? animals : [];

  const current = useMemo(() => {
    if (scope === "operation") return operation;
    const found = list.find((i) => i.id === itemId) ?? list[0];
    return found ? { cost: found.cost, revenue: found.revenue } : { cost: 0, revenue: 0 };
  }, [scope, itemId, list, operation]);

  const pctToBreakEven = current.cost > 0 ? Math.min(100, (current.revenue / current.cost) * 100) : current.revenue > 0 ? 100 : 0;
  const metBreakEven = current.revenue >= current.cost && current.cost > 0;
  const gap = current.cost - current.revenue;

  return (
    <div className="card p-5">
      <h3 className="font-semibold text-stone-800 mb-1">Break-even point</h3>
      <p className="text-xs text-stone-400 mb-4">
        Revenue needed to cover costs (purchases + labor tagged to the scope you pick, or the whole operation).
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        <select
          className="input !w-auto"
          value={scope}
          onChange={(e) => {
            const next = e.target.value as "operation" | "field" | "animal";
            setScope(next);
            if (next === "field") setItemId(fields[0]?.id ?? "");
            if (next === "animal") setItemId(animals[0]?.id ?? "");
          }}
        >
          <option value="operation">Whole operation</option>
          {fields.length > 0 && <option value="field">By field</option>}
          {animals.length > 0 && <option value="animal">By animal (livestock)</option>}
        </select>
        {scope !== "operation" && list.length > 0 && (
          <select className="input !w-auto" value={itemId} onChange={(e) => setItemId(e.target.value)}>
            {list.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
          </select>
        )}
      </div>

      {current.cost === 0 && current.revenue === 0 ? (
        <p className="text-sm text-stone-400">No cost or revenue data for this scope yet.</p>
      ) : (
        <>
          <div className="grid sm:grid-cols-3 gap-4 mb-3">
            <div className="rounded-lg border border-stone-200 p-3">
              <div className="text-xs text-stone-400">Total cost</div>
              <div className="font-semibold text-stone-800">{fmtCurrency2(current.cost)}</div>
            </div>
            <div className="rounded-lg border border-stone-200 p-3">
              <div className="text-xs text-stone-400">Total revenue</div>
              <div className="font-semibold text-stone-800">{fmtCurrency2(current.revenue)}</div>
            </div>
            <div className="rounded-lg border border-stone-200 p-3">
              <div className="text-xs text-stone-400">{metBreakEven ? "Surplus past break-even" : "Left to break even"}</div>
              <div className={`font-semibold ${metBreakEven ? "text-emerald-700" : "text-red-600"}`}>
                {fmtCurrency2(Math.abs(gap))}
              </div>
            </div>
          </div>
          <div className="w-full bg-stone-100 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full ${metBreakEven ? "bg-emerald-600" : "bg-brand-700"}`}
              style={{ width: `${pctToBreakEven}%` }}
            />
          </div>
          <p className="text-xs text-stone-400 mt-1.5">
            {metBreakEven ? "Past break-even — this is now profitable." : `${pctToBreakEven.toFixed(0)}% of the way to break-even.`}
          </p>
        </>
      )}
    </div>
  );
}
