import { getOrgContext, getLaborEntries, getFields, getAnimals, getBatches } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import LaborClient from "./LaborClient";

export default async function LaborPage() {
  const ctx = await getOrgContext();
  const [entries, fields, animals, batches] = await Promise.all([
    getLaborEntries(ctx.orgId),
    getFields(ctx.orgId),
    getAnimals(ctx.orgId),
    getBatches(ctx.orgId),
  ]);
  return (
    <div>
      <PageHeader
        title="Labor"
        subtitle="Hours and cost, optionally tied to a field, animal, or batch so labor shows up in Profitability alongside purchases and sales."
      />
      <LaborClient orgId={ctx.orgId} entries={entries} fields={fields} animals={animals} batches={batches} />
    </div>
  );
}
