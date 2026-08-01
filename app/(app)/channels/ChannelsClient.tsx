"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";
import ChannelForm from "@/components/forms/ChannelForm";
import OfflineDataBanner from "@/components/OfflineDataBanner";
import { useLiveCachedTable } from "@/lib/useLiveCachedTable";
import { useOnlineStatus } from "@/lib/useOnlineStatus";

const COLUMNS = [
  { key: "untried", label: "Untried", hint: "Haven't reached out yet", color: "border-stone-300" },
  { key: "attempted", label: "Attempted", hint: "Reached out, no traction yet", color: "border-amber-300" },
  { key: "in_progress", label: "In Progress", hint: "Talking, sampling, negotiating", color: "border-blue-300" },
  { key: "active", label: "Active", hint: "Successfully obtained — buying now", color: "border-emerald-300" },
] as const;

export default function ChannelsClient({ orgId, channels: serverChannels }: { orgId: string; channels: any[] }) {
  const [showForm, setShowForm] = useState(false);
  // Phase 3 of the local-first rewrite (see HarvestOS_Local_First_Rewrite_Plan.md). `items` stays
  // its own state (not read directly off the live hook) because this board does optimistic
  // drag-style status moves — moveTo() below updates it immediately, before the write round-trips.
  // It re-syncs to the canonical live Dexie value whenever that changes (a background sync pull, a
  // write landing from this or another device), so an optimistic update never permanently drifts
  // from the truth if the actual write fails or a change comes in from elsewhere.
  const liveChannels = useLiveCachedTable("sales_channels", orgId, serverChannels);
  const isOffline = useOnlineStatus();
  const [items, setItems] = useState(liveChannels);
  useEffect(() => { setItems(liveChannels); }, [liveChannels]);
  const supabase = createClient();
  const router = useRouter();

  async function moveTo(id: string, status: string) {
    setItems((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    if (DEMO_MODE) return;
    await supabase.from("sales_channels").update({ status, last_contact_date: new Date().toISOString().slice(0, 10) }).eq("id", id);
    router.refresh();
  }

  return (
    <div>
      <OfflineDataBanner usingCache={isOffline} cachedAt={null} />
      <div className="flex justify-end mb-4">
        {!showForm && <button className="btn-primary" onClick={() => setShowForm(true)}>+ Add channel</button>}
      </div>
      {showForm && <ChannelForm orgId={orgId} onDone={() => setShowForm(false)} />}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          const colItems = items.filter((c) => c.status === col.key);
          return (
            <div key={col.key} className={`card border-t-4 ${col.color} p-3 min-h-[200px]`}>
              <div className="flex items-baseline justify-between mb-1 px-1">
                <h3 className="font-semibold text-sm text-stone-800">{col.label}</h3>
                <span className="text-xs text-stone-400">{colItems.length}</span>
              </div>
              <p className="text-[11px] text-stone-400 px-1 mb-3">{col.hint}</p>
              <div className="space-y-2">
                {colItems.map((c) => (
                  <div key={c.id} className="rounded-xl border border-stone-200 bg-white p-3">
                    <div className="font-medium text-sm text-stone-800">{c.name}</div>
                    <div className="text-[11px] text-stone-400 capitalize">{c.channel_type.replace("_", " ")}{c.area ? ` · ${c.area}` : ""}</div>
                    {c.pitch_notes && <p className="text-xs text-stone-500 mt-1.5 line-clamp-2">{c.pitch_notes}</p>}
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {COLUMNS.filter((o) => o.key !== col.key).map((o) => (
                        <button
                          key={o.key}
                          onClick={() => moveTo(c.id, o.key)}
                          className="text-[10px] px-2 py-1 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 font-medium transition-colors"
                        >
                          → {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {colItems.length === 0 && <p className="text-xs text-stone-300 italic px-1">Nothing here</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
