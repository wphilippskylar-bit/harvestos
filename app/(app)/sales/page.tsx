import { getOrgContext, getSales, getSalesChannels, getCrops, getFields, getAnimals } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import SalesClient from "./SalesClient";

export default async function SalesPage() {
  const ctx = await getOrgContext();
  const [sales, channels, crops, fields, animals] = await Promise.all([
    getSales(ctx.orgId),
    getSalesChannels(ctx.orgId),
    getCrops(ctx.orgId),
    getFields(ctx.orgId),
    getAnimals(ctx.orgId),
  ]);
  return (
    <div>
      <PageHeader title="Sales" subtitle="Every sale, logged — the tab that turns a plan into a real business." />
      <SalesClient orgId={ctx.orgId} sales={sales} channels={channels} crops={crops} fields={fields} animals={animals} />
    </div>
  );
}
