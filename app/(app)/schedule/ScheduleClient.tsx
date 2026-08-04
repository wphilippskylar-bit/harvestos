"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";
import { EmptyState } from "@/components/ui";
import ScheduleEventForm from "@/components/forms/ScheduleEventForm";
import OfflineDataBanner from "@/components/OfflineDataBanner";
import { useLiveCachedTable } from "@/lib/useLiveCachedTable";
import { useOnlineStatus } from "@/lib/useOnlineStatus";

type Event = {
  id: string;
  title: string;
  notes: string | null;
  event_date: string;
  event_type: string;
  status: string;
  batches: { batch_id: string; crop_name_snapshot: string } | null;
  fields: { name: string } | null;
  cea_areas: { name: string } | null;
  animals: { ear_tag_number: string } | null;
};
type LinkOption = { id: string; label: string };

const TYPE_BADGES: Record<string, string> = {
  planting: "bg-emerald-100 text-emerald-700",
  harvest: "bg-amber-100 text-amber-700",
  maintenance: "bg-blue-100 text-blue-700",
  sales: "bg-purple-100 text-purple-700",
  other: "bg-stone-100 text-stone-600",
};

function linkedLabel(e: Event): string | null {
  if (e.batches) return `Batch ${e.batches.batch_id} (${e.batches.crop_name_snapshot})`;
  if (e.fields) return `Field: ${e.fields.name}`;
  if (e.cea_areas) return `Greenhouse/Indoor: ${e.cea_areas.name}`;
  if (e.animals) return `Animal: ${e.animals.ear_tag_number}`;
  return null;
}

export default function ScheduleClient({
  orgId, role, events: serverEvents, batches = [], fields = [], ceaAreas = [], animals = [],
}: {
  orgId: string;
  role: string;
  events: Event[];
  batches?: LinkOption[];
  fields?: LinkOption[];
  ceaAreas?: LinkOption[];
  animals?: LinkOption[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const isEditor = role === "owner" || role === "admin" || role === "member";
  // Phase 5 of the local-first rewrite (see HarvestOS_Local_First_Rewrite_Plan.md). Only the
  // events list itself is converted — batches/fields/ceaAreas/animals here are just id/label
  // lookups for the "link this to..." dropdown on the create-event form, which needs a live
  // connection to actually save a new event regardless, so they're left as plain server props.
  const events = useLiveCachedTable<Event>("schedule_events", orgId, serverEvents);
  const isOffline = useOnlineStatus();
  const [showForm, setShowForm] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("all");

  async function setStatus(id: string, status: string) {
    if (DEMO_MODE) return;
    await supabase.from("schedule_events").update({ status }).eq("id", id);
    router.refresh();
  }

  async function deleteEvent(id: string, title: string) {
    if (DEMO_MODE) return;
    if (!window.confirm(`Delete "${title}" from the schedule?`)) return;
    await supabase.from("schedule_events").delete().eq("id", id);
    router.refresh();
  }

  const filtered = typeFilter === "all" ? events : events.filter((e) => e.event_type === typeFilter);
  const todayStr = new Date().toISOString().slice(0, 10);
  const pending = filtered.filter((e) => e.status === "pending");
  const overdue = pending.filter((e) => e.event_date < todayStr);
  const upcoming = pending.filter((e) => e.event_date >= todayStr);
  const done = filtered.filter((e) => e.status !== "pending");

  function EventRow({ e }: { e: Event }) {
    const linked = linkedLabel(e);
    return (
      <div className="py-2.5 flex items-start justify-between gap-3 text-sm">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-medium ${e.status !== "pending" ? "text-stone-400 line-through" : "text-stone-800"}`}>{e.title}</span>
            <span className={`badge ${TYPE_BADGES[e.event_type] ?? TYPE_BADGES.other}`}>{e.event_type}</span>
          </div>
          <div className="text-xs text-stone-400 mt-0.5">
            {e.event_date}
            {linked && ` · ${linked}`}
          </div>
          {e.notes && <div className="text-xs text-stone-500 mt-0.5">{e.notes}</div>}
        </div>
        {isEditor && (
          <div className="flex items-center gap-2 shrink-0">
            {e.status === "pending" ? (
              <>
                <button className="text-xs font-medium text-emerald-700 hover:underline" onClick={() => setStatus(e.id, "done")}>Done</button>
                <button className="text-xs font-medium text-stone-400 hover:underline" onClick={() => setStatus(e.id, "skipped")}>Skip</button>
              </>
            ) : (
              <button className="text-xs font-medium text-brand-700 hover:underline" onClick={() => setStatus(e.id, "pending")}>Reopen</button>
            )}
            <button className="text-xs font-medium text-red-600 hover:underline" onClick={() => deleteEvent(e.id, e.title)}>Delete</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <OfflineDataBanner usingCache={isOffline} cachedAt={null} />
      {isEditor && (
        showForm
          ? <ScheduleEventForm orgId={orgId} batches={batches} fields={fields} ceaAreas={ceaAreas} animals={animals} onDone={() => setShowForm(false)} />
          : <div className="flex justify-end"><button className="btn-primary" onClick={() => setShowForm(true)}>+ Add to schedule</button></div>
      )}

      <div className="flex flex-wrap gap-2">
        {["all", "planting", "harvest", "maintenance", "sales", "other"].map((t) => (
          <button
            key={t}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors capitalize ${
              typeFilter === t ? "bg-brand-700 text-white border-brand-700" : "bg-white text-stone-500 border-stone-300"
            }`}
            onClick={() => setTypeFilter(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {events.length === 0 ? (
        <EmptyState title="Nothing on the schedule yet" hint="Add a planting, harvest, maintenance, or sales task — as far out as you want to plan." />
      ) : (
        <>
          {overdue.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-stone-100 bg-red-50/50">
                <h3 className="font-semibold text-red-700 text-sm">Overdue</h3>
              </div>
              <div className="px-5 divide-y divide-stone-100">
                {overdue.map((e) => <EventRow key={e.id} e={e} />)}
              </div>
            </div>
          )}
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-stone-100">
              <h3 className="font-semibold text-stone-800 text-sm">Upcoming</h3>
            </div>
            <div className="px-5 divide-y divide-stone-100">
              {upcoming.length === 0 ? (
                <p className="py-4 text-xs text-stone-400">Nothing upcoming.</p>
              ) : (
                upcoming.map((e) => <EventRow key={e.id} e={e} />)
              )}
            </div>
          </div>
          {done.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-stone-100">
                <h3 className="font-semibold text-stone-500 text-sm">Done / skipped</h3>
              </div>
              <div className="px-5 divide-y divide-stone-100">
                {done.map((e) => <EventRow key={e.id} e={e} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
