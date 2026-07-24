"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";
import { errorMessage } from "@/lib/errors";

const EVENT_TYPES = [
  { key: "planting", label: "Planting" },
  { key: "harvest", label: "Harvest" },
  { key: "maintenance", label: "Maintenance" },
  { key: "sales", label: "Sales" },
  { key: "other", label: "Other" },
];

type LinkOption = { id: string; label: string };

export default function ScheduleEventForm({
  orgId, batches = [], fields = [], ceaAreas = [], animals = [], onDone,
}: {
  orgId: string;
  batches?: LinkOption[];
  fields?: LinkOption[];
  ceaAreas?: LinkOption[];
  animals?: LinkOption[];
  onDone: () => void;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10));
  const [eventType, setEventType] = useState("other");
  const [linkKind, setLinkKind] = useState<"" | "batch" | "field" | "cea" | "animal">("");
  const [linkId, setLinkId] = useState("");
  const [notify, setNotify] = useState(true);
  const [remindDaysBefore, setRemindDaysBefore] = useState("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const linkOptionsByKind: Record<string, LinkOption[]> = { batch: batches, field: fields, cea: ceaAreas, animal: animals };
  const hasAnyLinkable = batches.length > 0 || fields.length > 0 || ceaAreas.length > 0 || animals.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (DEMO_MODE) { onDone(); return; }
      const { error } = await supabase.from("schedule_events").insert({
        org_id: orgId,
        title,
        notes: notes || null,
        event_date: eventDate,
        event_type: eventType,
        batch_id: linkKind === "batch" ? linkId || null : null,
        field_id: linkKind === "field" ? linkId || null : null,
        cea_area_id: linkKind === "cea" ? linkId || null : null,
        animal_id: linkKind === "animal" ? linkId || null : null,
        notify,
        remind_days_before: remindDaysBefore ? Number(remindDaysBefore) : 0,
      });
      if (error) throw error;
      onDone();
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, "Could not save schedule item"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 mb-4 space-y-4">
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <label className="label">Title</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Harvest Tray Batch #12" required />
        </div>
        <div>
          <label className="label">Date</label>
          <input className="input" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required />
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input" value={eventType} onChange={(e) => setEventType(e.target.value)}>
            {EVENT_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </div>
        {hasAnyLinkable && (
          <>
            <div>
              <label className="label">Link to (optional)</label>
              <select
                className="input"
                value={linkKind}
                onChange={(e) => { setLinkKind(e.target.value as any); setLinkId(""); }}
              >
                <option value="">— None —</option>
                {batches.length > 0 && <option value="batch">A batch</option>}
                {fields.length > 0 && <option value="field">A field</option>}
                {ceaAreas.length > 0 && <option value="cea">A Greenhouse/Indoor area</option>}
                {animals.length > 0 && <option value="animal">An animal</option>}
              </select>
            </div>
            {linkKind && (
              <div>
                <label className="label">&nbsp;</label>
                <select className="input" value={linkId} onChange={(e) => setLinkId(e.target.value)}>
                  <option value="">— Select —</option>
                  {linkOptionsByKind[linkKind].map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
            )}
          </>
        )}
        <div className="sm:col-span-3">
          <label className="label">Notes</label>
          <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="sm:col-span-3 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-stone-600">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
            Notify me for this item
          </label>
          {notify && (
            <label className="flex items-center gap-2 text-sm text-stone-600">
              Remind
              <input
                className="input !w-16 !py-1"
                type="number"
                min="0"
                value={remindDaysBefore}
                onChange={(e) => setRemindDaysBefore(e.target.value)}
              />
              day(s) before
            </label>
          )}
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" className="btn-secondary" onClick={onDone}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Add to schedule"}</button>
      </div>
    </form>
  );
}
