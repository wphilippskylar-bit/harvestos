"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";
import { errorMessage } from "@/lib/errors";
import { BASE_NAV } from "@/components/Nav";

export default function NavOrderSettings({
  orgId, userId, operationTypes, navOrder,
}: {
  orgId: string;
  userId: string | null;
  operationTypes: string[];
  navOrder: string[] | null;
}) {
  const supabase = createClient();
  const router = useRouter();

  const visible = BASE_NAV.filter((item) => {
    if (item.href === "/dashboard") return false;
    if (!item.requires) return true;
    const required = Array.isArray(item.requires) ? item.requires : [item.requires];
    return required.some((r) => operationTypes.includes(r));
  });

  const initialOrder = navOrder && navOrder.length > 0
    ? [
        ...navOrder.map((href) => visible.find((i) => i.href === href)).filter((i): i is typeof visible[number] => !!i),
        ...visible.filter((i) => !navOrder.includes(i.href)),
      ]
    : visible;

  const [order, setOrder] = useState(initialOrder);
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

  async function save() {
    if (!userId) return;
    setSaving(true);
    setError(null);
    try {
      if (DEMO_MODE) { setSaved(true); return; }
      const { error: err } = await supabase
        .from("user_nav_prefs")
        .upsert({ user_id: userId, org_id: orgId, nav_order: order.map((i) => i.href), updated_at: new Date().toISOString() });
      if (err) throw err;
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, "Could not save nav order"));
    } finally {
      setSaving(false);
    }
  }

  function resetToDefault() {
    setOrder(visible);
    setSaved(false);
  }

  return (
    <div className="card p-5">
      <h2 className="font-semibold text-stone-800 mb-1">Customize navigation</h2>
      <p className="text-xs text-stone-500 mb-3">
        Reorder your left-nav tabs — this only affects your own view, not your team's. Dashboard
        always stays pinned at the top.
      </p>
      <div className="divide-y divide-stone-100 border border-stone-200 rounded-lg overflow-hidden max-w-md">
        <div className="px-3 py-2 text-sm text-stone-400 bg-stone-50">Dashboard <span className="text-xs">(always first)</span></div>
        {order.map((item, i) => (
          <div key={item.href} className="px-3 py-2 flex items-center justify-between text-sm">
            <span className="text-stone-700">{item.label}</span>
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
        ))}
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      <div className="flex items-center gap-3 mt-3">
        <button className="btn-primary !py-1.5 text-sm" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save order"}
        </button>
        <button className="btn-secondary !py-1.5 text-sm" onClick={resetToDefault}>Reset to default</button>
        {saved && <span className="text-xs text-emerald-700">Saved.</span>}
      </div>
    </div>
  );
}
