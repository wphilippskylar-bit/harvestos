import { getOrgContext, getScheduleEvents, getBatches, getFields, getCeaAreas, getAnimals } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import ScheduleClient from "./ScheduleClient";

export default async function SchedulePage() {
  const ctx = await getOrgContext();
  const [events, batches, fields, ceaAreas, animals] = await Promise.all([
    getScheduleEvents(ctx.orgId),
    getBatches(ctx.orgId),
    getFields(ctx.orgId),
    getCeaAreas(ctx.orgId),
    getAnimals(ctx.orgId),
  ]);
  return (
    <div>
      <PageHeader
        title="Schedule"
        subtitle="Plan plantings, harvests, maintenance, and sales tasks as far out as you want — with optional reminders."
      />
      <ScheduleClient
        orgId={ctx.orgId}
        role={ctx.role}
        events={events as any}
        batches={(batches as any[]).map((b) => ({ id: b.id, label: `${b.batch_id} — ${b.crop_name_snapshot}` }))}
        fields={(fields as any[]).map((f) => ({ id: f.id, label: f.name }))}
        ceaAreas={(ceaAreas as any[]).map((a) => ({ id: a.id, label: a.name }))}
        animals={(animals as any[]).map((a) => ({ id: a.id, label: a.ear_tag_number }))}
      />
    </div>
  );
}
