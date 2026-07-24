"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";
import { errorMessage } from "@/lib/errors";
import { DASHBOARD_CARDS, resolveCardOrder } from "@/app/(app)/dashboard/DashboardCards";

export default function DashboardCustomizeSettings({
  orgId, userId, cardOrder, hiddenCards,
}: {
  orgId: string;
  userId: string | null;
  cardOrder: string[] | null;
  hiddenCards: string[];
}) {
  const supabase = createClient();
  const router = useRouter();

  const initialOrder = resolveCardOrder(cardOrder);

  const [order, setOrder] = useState(initialOrder);
  const [hidden, setHidden] = useState<string[]>(hiddenCards);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function move(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= order.length) return;
    const copy = [...order];
    [copy[index], copy[next]] = [copy[next], copy[index]];
    setOrder(copy);
    setSaved(false);
  }

  function toggleHidden(key: string) {
    setHidden((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
    setSaved(false);
  }

  async function save() {
    if (!userId) return;
    setSaving(true);
    setError(null);
    try {
      if (DEMO_MODE) { setSaved(true); return; }
      const { error: err } = await supabase
        .from("user_dashboard_prefs")
        .upsert({
          user_id: userId,
          org_id: orgId,
          card_order: order.map((c) => c.key),
          hidden_cards: hidden,
          updated_at: new Date().toISOString(),
        });
      if (err) throw err;
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, "Could not save dashboard layout"));
    } finally {
      setSaving(false);
    }
  }

  function resetToDefault() {
    setOrder(DASHBOARD_CARDS);
    setHidden([]);
    setSaved(false);
  }

  return (
    <div className="card p-5">
      <h2 className="font-semibold text-stone-800 mb-1">Customize dashboard</h2>
      <p className="text-xs text-stone-500 mb-3">
        Hide the cards you don't check and reorder the rest — only affects your own view. The
        revenue/costs/trays/channels tiles at the top always stay put.
      </p>
      <div className="divide-y divide-stone-100 border border-stone-200 rounded-lg overflow-hidden max-w-md">
        {order.map((card, i) => {
          const isHidden = hidden.includes(card.key);
          return (
            <div key={card.key} className={`px-3 py-2 flex items-center justify-between text-sm ${isHidden ? "opacity-50" : ""}`}>
              <label className="flex items-center gap-2 text-stone-700 cursor-pointer">
                <input type="checkbox" checked={!isHidden} onChange={() => toggleHidden(card.key)} />
                {card.label}
              </label>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="text-stone-400 hover:text-stone-700 disabled:opacity-30 px-1"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="text-stone-400 hover:text-stone-700 disabled:opacity-30 px-1"
                  onClick={() => move(i, 1)}
                  disabled={i === order.length - 1}
                  aria-label="Move down"
                >
                  ↓
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      <div className="flex items-center gap-3 mt-3">
        <button className="btn-primary !py-1.5 text-sm" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save dashboard layout"}
        </button>
        <button className="btn-secondary !py-1.5 text-sm" onClick={resetToDefault}>Reset to default</button>
        {saved && <span className="text-xs text-emerald-700">Saved.</span>}
      </div>
    </div>
  );
}
